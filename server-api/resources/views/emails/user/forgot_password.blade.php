@component('mail::layout')

    <?php
        $emailData = EmailHelper::getMailTemplateProps(Kinderm8\Enums\RoleType::ORGADMIN);
    ?>

    {{-- Header --}}
    @slot('header')
        @component('mail::header', ['url' => config('app.url'), 'class' => 'blue'])
            <div class="text-center">
                <img src="{{ $emailData['logo'] }}" alt="{{ $emailData['title'] }}" name="{{ $emailData['name'] }}" class="logo-header">
            </div>
        @endcomponent
    @endslot

    {{-- Body --}}
    @slot('subcopy')
        <p>Hi <strong>{{ $user->full_name }}</strong>,</p>

        <p>You are receiving this email because we received a password reset request for your account.</p>

        @component('mail::button', ['url' => $url])
            Reset Password
        @endcomponent

        <p>This password reset link will expire in <span style="color: red; font-weight: 600;">{{ $expiry }} minutes</span>. If you did not request a password reset, no further action is required.</p>

        <p>For more clarification, please contact : <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

        <p>Thanks,<br> {{ $emailData['name'] }}</p>

        @component('mail::subcopy')
            <p style="font-size: 13px;">If you’re having trouble clicking the "Reset Password" button, copy and paste the URL into your web browser <a href="{{ $url }}">{{ $url }}</a></p>
        @endcomponent
    @endslot

    {{-- Footer --}}
    @slot('footer')
        @component('mail::footer', ['nomargin' => true, 'showsocial' => true])
        &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        @endcomponent
    @endslot

@endcomponent
