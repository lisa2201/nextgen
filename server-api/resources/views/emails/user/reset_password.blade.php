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

        <p>Your request to reset the password for Kinder m8 account has been processed. We are here to help!</p>

        <p>Your password has been reset. Please find your login details below</p>

        <p style="margin-bottom: 2px; font-size: 13px; font-weight: 600"><span style="font-weight: 600">Email</span> : <span style="font-weight: 600">{{ $user->email }}</span></p>
        <p style="font-size: 13px; font-weight: 600"><span style="font-weight: 600">Password</span> : <span style="font-weight: 600">{{ $password }}</span></p>

        @component('mail::button', ['url' => $url])
            Let's Continue
        @endcomponent

        <p>If this hasn’t been requested by you, please contact : <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

        <p>Thanks,<br> {{ $emailData['name'] }}</p>

    @endslot

    {{-- Footer --}}
    @slot('footer')
        @component('mail::footer', ['nomargin' => true, 'showsocial' => true])
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        @endcomponent
    @endslot

@endcomponent
