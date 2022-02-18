@component('mail::message')

# Hello **{{ $user->full_name }}**

The introduction to the site manager.

@component('mail::button', ['url' => $url])
Login to Sitemanager
@endcomponent

@component('components.subscription_help_panel')
<strong>Whoops!</strong> Something went wrong!
@endcomponent

Thank you for choosing our application!

Thanks,<br>
{{ config('app.name') }}

@endcomponent
