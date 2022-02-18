<?php

namespace Kinderm8\Traits;

use Auth;
use Exception;
use GuzzleHttp\Exception\ClientException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\PassportOAuthClient;
use Laravel\Passport\ClientRepository;
use Laravel\Passport\Guards\TokenGuard;
use Laravel\Passport\TokenRepository;
use League\OAuth2\Server\ResourceServer;
use Psr\Http\Message\ServerRequestInterface;

trait PassportClient
{
    use PassportToken;

    /**
     * @param Model $user
     * @param Request $request
     * @return mixed|null
     * @throws Exception
     */
    protected function loginRequest(Model $user, Request $request)
    {
        try
        {
            $oClient = PassportOAuthClient::where('password_client', 1)->first();

            $req = Request::create('/oauth/token', 'POST', [
                'grant_type' => 'password',
                'client_id' => $oClient->id,
                'client_secret' => $oClient->secret,
                'username' => $user->id,
                'password' => $request->input('password'),
                'scope' => '',
            ]);

            $response = app()->handle($req);

            return ($response->status() === 200) ? json_decode($response->getContent(), true) : null;
        }
        catch (Exception $e)
        {
            throw $e;
        }
    }

    /**
     * @param Model $user
     * @return mixed
     * @throws Exception
     */
    protected function loginMobileRequest(Model $user)
    {
        try
        {
            $oClient = PassportOAuthClient::where('personal_access_client', 1)->first();

            return $user->createToken($oClient->name)->accessToken;
        }
        catch (Exception $e)
        {
            throw $e;
        }
    }

    /**
     * @param Request $request
     * @param ServerRequestInterface $psr
     * @return mixed
     */
    protected function refreshTokenRequest(Request $request, ServerRequestInterface $psr)
    {
        try
        {
            /*$oClient = PassportOAuthClient::where('password_client', 1)->first();

            $response = (new Client)->post('http://127.0.0.1/oauth/token', [
                'form_params' => [
                    'grant_type' => 'refresh_token',
                    'refresh_token' => $request->header('refresh-token'),
                    'client_id' => $oClient->id,
                    'client_secret' => $oClient->secret,
                    'scope' => '',
                ],
                'debug' => false,
                'verify' => false
            ]);

            return [
                'code' => $response->getStatusCode(),
                'response' => json_decode((string) $response->getBody(), true)
            ];*/

            return [
                'code' => 200,
                'response' => $this->getRefreshToken($request, $psr)
            ];
        }
        catch (ClientException $e)
        {
            return [
                'code' => 400,
                'response' => $e->getMessage()
            ];
        }
        catch (Exception $e)
        {
            return [
                'code' => 400,
                'response' => $e->getMessage()
            ];
        }
    }

    /**
     * get user from bearer token
     * @param $bearerToken
     * @return mixed|null
     * @throws Exception
     */
    protected function getUserFromBearerToken($bearerToken)
    {
        try
        {
            $tokenGuard = new TokenGuard(
                app(ResourceServer::class),
                Auth::createUserProvider('users'),
                app(TokenRepository::class),
                app(ClientRepository::class),
                app('encrypter')
            );

            $request = Request::create('/');
            $request->headers->set('Authorization', 'Bearer ' . $bearerToken);

            return $tokenGuard->user($request);
        }
        catch(Exception $e)
        {
            throw $e;
        }
    }

    /**
     * authorize user
     * @param Request $request
     * @param $bearerToken
     */
    protected function authorizeUser(Request $request, $bearerToken)
    {
        //$new_request = request();
        $request->headers->set('Authorization', 'Bearer ' . $bearerToken);

        Auth::setRequest($request);
    }
}
