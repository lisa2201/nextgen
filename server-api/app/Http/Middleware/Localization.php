<?php

namespace Kinderm8\Http\Middleware;

use Closure;

class Localization
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        // read the language from the request header
        $locale = $request->header('Content-Language');

        // if the header is missed
        if(!$locale)
        {
            // take the default local language
            $locale = app()->getLocale();
        }

        // set the local language
        app()->setLocale($locale);

        return $next($request);
    }
}
