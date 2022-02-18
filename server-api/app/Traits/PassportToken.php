<?php

namespace Kinderm8\Traits;

use DateTimeImmutable;
use Exception;
use GuzzleHttp\Psr7\Response;
use Kinderm8\PassportOAuthClient;
use Laravel\Passport\Bridge\AccessToken;
use Laravel\Passport\Bridge\AccessTokenRepository;
use Laravel\Passport\Bridge\Client;
use Laravel\Passport\Bridge\RefreshToken;
use Laravel\Passport\Bridge\RefreshTokenRepository;
use Laravel\Passport\Passport;
use Laravel\Passport\Token;
use Lcobucci\JWT\Parser;
use League\Event\EmitterAwareTrait;
use League\OAuth2\Server\CryptKey;
use League\OAuth2\Server\CryptTrait;
use League\OAuth2\Server\Entities\AccessTokenEntityInterface;
use League\OAuth2\Server\Entities\RefreshTokenEntityInterface;
use League\OAuth2\Server\Exception\OAuthServerException;
use League\OAuth2\Server\Exception\UniqueTokenIdentifierConstraintViolationException;
use League\OAuth2\Server\RequestEvent;
use League\OAuth2\Server\ResponseTypes\BearerTokenResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

trait PassportToken
{
    use CryptTrait, EmitterAwareTrait;

    /**
     * @param $userId
     * @return array
     * @throws UniqueTokenIdentifierConstraintViolationException|OAuthServerException
     */
    protected function createPassportTokenByUserId($userId)
    {
        // generate access token
        $accessToken = $this->issueAccessToken($userId);

        // generate refresh token
        $refreshToken = json_decode($this->sendBearerTokenResponse($accessToken, $this->issueRefreshToken($accessToken))->getBody(), true)['refresh_token'];

        return [
            'access_token' => (string) $accessToken,
            'refresh_token' => (string) $refreshToken,
        ];
    }

    /**
     * @param $accessToken
     * @param $refreshToken
     * @return BearerTokenResponse|ResponseInterface
     */
    protected function sendBearerTokenResponse($accessToken, $refreshToken)
    {
        $response = new BearerTokenResponse();
        $response->setAccessToken($accessToken);
        $response->setRefreshToken($refreshToken);

        $privateKey = new CryptKey('file://'. Passport::keyPath('oauth-private.key'), null, false);

        $response->setPrivateKey($privateKey);
        $response->setEncryptionKey(app('encrypter')->getKey());

        return $response->generateHttpResponse(new Response);
    }

    /**
     * @param $userId
     * @param bool $output
     * @return BearerTokenResponse|mixed|ResponseInterface
     * @throws OAuthServerException
     * @throws UniqueTokenIdentifierConstraintViolationException
     */
    protected function getBearerTokenByUser($userId, $output = true)
    {
        $passportToken = $this->createPassportTokenByUserId($userId);
        $bearerToken = $this->sendBearerTokenResponse($passportToken['access_token'], $passportToken['refresh_token']);

        if (! $output)
        {
            $bearerToken = json_decode($bearerToken->getBody()->__toString(), true);
        }

        return $bearerToken;
    }

    /**
     * @param $request
     * @param ServerRequestInterface $psr
     * @return array|null
     * @throws OAuthServerException
     */
    protected function getRefreshToken($request, ServerRequestInterface $psr)
    {
        // get token object
        $accessToken = Token::findOrFail((new Parser())->parse($request->bearerToken())->getClaim('jti'));

        // Validate request
        $oldRefreshToken = $this->validateOldRefreshToken($psr, $accessToken->client_id);

        // Expire old tokens
        (app(AccessTokenRepository::class))->revokeAccessToken($oldRefreshToken['access_token_id']);
        (app(RefreshTokenRepository::class))->revokeRefreshToken($oldRefreshToken['refresh_token_id']);

        $tokens = null;

        try
        {
            $tokens = $this->createPassportTokenByUserId($accessToken->user_id);
        }
        catch (UniqueTokenIdentifierConstraintViolationException $e)
        {
            throw OAuthServerException::invalidRefreshToken('Invalid token');
        }

        return $tokens;
    }

    /**
     * @param ServerRequestInterface $request
     * @param $clientId
     * @return mixed
     * @throws OAuthServerException
     */
    protected function validateOldRefreshToken(ServerRequestInterface $request, $clientId)
    {
        $encryptedRefreshToken = is_array($request->getHeader('refresh-token')) && !empty($request->getHeader('refresh-token')) ? $request->getHeader('refresh-token')[0] : null;
        if (is_null($encryptedRefreshToken))
        {
            throw OAuthServerException::invalidRequest('refresh-token');
        }

        // Validate refresh token
        try
        {
            $this->setEncryptionKey(app('encrypter')->getKey());

            $refreshToken = $this->decrypt($encryptedRefreshToken);
        }
        catch (Exception $e)
        {
            throw OAuthServerException::invalidRefreshToken('Cannot decrypt the refresh token', $e);
        }

        $refreshTokenData = json_decode($refreshToken, true);
        if ((int) $refreshTokenData['client_id'] !== (int) $clientId)
        {
            $this->getEmitter()->emit(new RequestEvent(RequestEvent::REFRESH_TOKEN_CLIENT_FAILED, $request));
            throw OAuthServerException::invalidRefreshToken('Token is not linked to client');
        }

        if ($refreshTokenData['expire_time'] < time())
        {
            throw OAuthServerException::invalidRefreshToken('Token has expired');
        }

        if ((app(RefreshTokenRepository::class))->isRefreshTokenRevoked($refreshTokenData['refresh_token_id']) === true)
        {
            throw OAuthServerException::invalidRefreshToken('Token has been revoked');
        }

        return $refreshTokenData;
    }

    /**
     * @param int $length
     * @return string
     * @throws OAuthServerException
     */
    private function generateUniqueCode($length = 40)
    {
        try
        {
            return bin2hex(random_bytes($length));
            // @codeCoverageIgnoreStart
        }
        catch (\TypeError $e)
        {
            throw OAuthServerException::serverError('An unexpected error has occurred');
        }
        catch (\Error $e)
        {
            throw OAuthServerException::serverError('An unexpected error has occurred');
        }
        catch (\Exception $e)
        {
            // If you get this message, the CSPRNG failed hard.
            throw OAuthServerException::serverError('Could not generate a random string');
        }
        // @codeCoverageIgnoreEnd
    }

    /**
     * @param $userId
     * @return AccessToken|AccessTokenEntityInterface
     * @return AccessTokenEntityInterface
     * @throws UniqueTokenIdentifierConstraintViolationException|OAuthServerException
     */
    private function issueAccessToken($userId)
    {
        $oClient = PassportOAuthClient::where('password_client', 1)->first();

        $client = new Client($oClient->id, null, null);
        $privateKey = new CryptKey('file://'. Passport::keyPath('oauth-private.key'), null, false);

        $accessTokenRepository = app(AccessTokenRepository::class);
        $accessToken = $accessTokenRepository->getNewToken($client, [], $userId);
        $accessToken->setExpiryDateTime((new DateTimeImmutable())->add(Passport::tokensExpireIn()));
        $accessToken->setPrivateKey($privateKey);

        $maxGenerationAttempts = 10;
        while ($maxGenerationAttempts-- > 0)
        {
            $accessToken->setIdentifier($this->generateUniqueCode());

            try
            {
                $accessTokenRepository->persistNewAccessToken($accessToken);

                return $accessToken;
            }
            catch (UniqueTokenIdentifierConstraintViolationException $e)
            {
                if ($maxGenerationAttempts === 0) throw $e;
            }
        }
    }

    /**
     * @param AccessTokenEntityInterface $accessToken
     * @return RefreshToken|RefreshTokenEntityInterface|null
     * @return RefreshTokenEntityInterface|null
     * @throws UniqueTokenIdentifierConstraintViolationException|OAuthServerException
     */
    private function issueRefreshToken(AccessTokenEntityInterface $accessToken)
    {
        $refreshTokenRepository = app(RefreshTokenRepository::class);

        $refreshToken = $refreshTokenRepository->getNewRefreshToken();

        if ($refreshToken === null)
        {
            return null;
        }

        $refreshToken->setExpiryDateTime((new DateTimeImmutable())->add(Passport::refreshTokensExpireIn()));
        $refreshToken->setAccessToken($accessToken);

        $maxGenerationAttempts = 10;
        while ($maxGenerationAttempts-- > 0)
        {
            $refreshToken->setIdentifier($this->generateUniqueCode());

            try
            {
                $refreshTokenRepository->persistNewRefreshToken($refreshToken);

                return $refreshToken;
            }
            catch (UniqueTokenIdentifierConstraintViolationException $e)
            {
                if ($maxGenerationAttempts === 0)
                {
                    throw $e;
                }
            }
        }
    }
}
