<?php

namespace Kinderm8\Traits;

use Carbon\Carbon;
use Exception;
use Illuminate\Config\Repository;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Log;
use Spatie\QueryBuilder\QueryBuilder;

trait Password
{
    /**
     * @param Model $user
     * @return string
     * @throws Exception
     */
    protected function createPasswordToken(Model $user)
    {
        $this->deleteExisting($user);

        // We will create a new, random token for the user so that we can e-mail them
        // a safe link to the password reset form. Then we will insert a record in
        // the database so that we can verify the token within the actual reset.
        $token = $this->createNewToken();

        $this->getTable()->insert($this->getPayload($user->id, $user->email, $token));

        return $token;
    }

    /**
     * Delete all existing reset tokens from the database.
     *
     * @param Model $user
     * @return int
     */
    protected function deleteExisting(Model $user)
    {
        return $this->getTable()
            ->where('user_id', $user->id)
            ->where('email', $user->email)
            ->delete();
    }

    /**
     * Build the record payload for the table.
     *
     * @param string $id
     * @param string $email
     * @param string $token
     * @return array
     */
    protected function getPayload(string $id, string $email, string $token)
    {
        return [
            'email' => $email,
            'user_id' => $id,
            'token' => $this->getHasher()->make($token),
            'created_at' => new Carbon
        ];
    }

    /**
     * Determine if a token record exists and is valid.
     *
     * @param  Model  $user
     * @param  string  $token
     * @return bool
     */
    protected function exists(Model $user, string $token)
    {
        $record = (array) $this->getTable()
            ->where('user_id', $user->id)
            ->where('email', $user->email)
            ->first();

        return $record &&
            ! $this->tokenExpired($record['created_at']) &&
            $this->getHasher()->check($token, $record['token']);
    }

    /**
     * Determine if the token has expired.
     *
     * @param  string  $createdAt
     * @return bool
     */
    protected function tokenExpired(string $createdAt)
    {
        return Carbon::parse($createdAt)->addMinutes($this->getConfig()['expire'])->isPast();
    }

    /**
     * Determine if the given user recently created a password reset token.
     *
     * @param Model $user
     * @return bool
     */
    protected function recentlyCreatedToken(Model $user)
    {
        $record = (array) $this->getTable()
            ->where('user_id', $user->id)
            ->where('email', $user->email)
            ->first();

        return $record && $this->tokenRecentlyCreated($record['created_at']);
    }

    /**
     * Determine if the token was recently created.
     *
     * @param  string  $createdAt
     * @return bool
     */
    protected function tokenRecentlyCreated(string $createdAt)
    {
        $throttle = $this->getConfig()['throttle'] ?? 0;

        if ($throttle <= 0)
        {
            return false;
        }

        return Carbon::parse($createdAt)->addSeconds($throttle)->isFuture();
    }

    /**
     * Delete expired tokens.
     *
     * @return void
     */
    protected function deleteExpired()
    {
        $expiredAt = Carbon::now()->subSeconds($this->getConfig()['expire']);

        $this->getTable()->where('created_at', '<', $expiredAt)->delete();
    }

    /**
     * Create a new token for the user.
     *
     * @return string
     */
    protected function createNewToken()
    {
        return hash_hmac('sha256', Str::random(40), $this->getHashKey());
    }

    /**
     * Set the user's password.
     *
     * @param  Model  $user
     * @param  string  $password
     * @return void
     */
    protected function setUserPassword(Model $user, string $password)
    {
        $user->password = $this->getHashedPassword($password);
    }

    /**
     * Get the hashed password.
     *
     * @param  string  $password
     * @return string
     */
    protected function getHashedPassword(string $password)
    {
        return Hash::make($password);
    }

    /**
     * get password config
     *
     * @return Repository|mixed
     */
    private function getConfig()
    {
        return config('auth.passwords.'.config('auth.defaults.passwords'));
    }

    /**
     * get reset password table
     *
     * @return Builder
     */
    private function getTable()
    {
        return app('db')->connection()->table($this->getConfig()['table']);
    }

    /**
     * get hash key
     *
     * @return string
     */
    private function getHashKey()
    {
        $key = config('app.key');

        if (Str::startsWith($key, 'base64:'))
        {
            $key = base64_decode(substr($key, 7));
        }

        return $key;
    }

    /**
     * Get the hasher instance.
     *
     * @return Hasher
     */
    private function getHasher()
    {
        return app('hash');
    }
}
