@component('mail::layout')

    <?php
        $emailData = EmailHelper::getMailTemplateProps(Kinderm8\Enums\RoleType::ORGADMIN);
    ?>

    {{-- Header --}}
    @slot('header')
        @component('mail::header', ['url' => config('app.url')])
            Welcome to {{ config('app.name') }}
            {{ $emailData['logo'] }}
        @endcomponent
    @endslot

    {{-- Body --}}
    @slot('subcopy')
        <h1>Thank You</h1>

        <p>Hello <strong>{{ $user->full_name }}</strong>,</p>

        <p>Thank you for subscribing to Kinderm8.</p>

        @component('mail::button', ['url' => $url])
        Login to Sitemanager
        @endcomponent

        @component('components.subscription_help_panel')

        @endcomponent

        <p>If you received this email by mistake, simply delete it.</p>

        <p>For more clarification, please contact : <a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

        <p>Thanks,<br>
        {{ config('app.name') }}</p>
    @endslot

    {{-- Subcopy --}}
    @isset($subcopy)
        @slot('subcopy')
            @component('mail::subcopy')
            {{ $subcopy }}
            @endcomponent
        @endslot
    @endisset

    {{-- Footer --}}
    @slot('footer')
        @component('mail::footer')
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        @endcomponent
    @endslot

@endcomponent
