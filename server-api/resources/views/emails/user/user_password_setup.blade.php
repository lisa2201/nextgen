@component('mail::layout')

    <?php
        $emailData = EmailHelper::getMailTemplateProps(Kinderm8\Enums\RoleType::ORGADMIN);
        $appsData = EmailHelper::getMailTemplatePropsAppsImage(Kinderm8\Enums\RoleType::ORGADMIN);
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

        <p style="font-size: 21px;">Hey {{$user->first_name}}, <img style="width: 20px; height: 20px;" src="{{ $appsData['wave'] }}" alt="wave icon" name="wave icon"></p>

        <p style="text-align: center">Your Early Childhood Service uses <strong> Kinder m8. </strong>  We are so excited to have you onboard!</p>

        <p style="text-align: center"><strong>Let’s get you started…</strong></p>

        <p style="text-align: center">First you will need to create a password for your account.</p>

        @component('mail::button', ['url' => $url])
            CREATE PASSWORD
        @endcomponent

        <p style="text-align: center; font-size: 24px;"> <strong>Next...</strong></p>

        <p style="text-align: center">
            Now you can access our Parents Portal <a href="{{ $branchUrl }}" target="_blank">{{ $branchUrl }}</a> or download the Kinder m8 Family Lounge app
            onto your device.
            We have gone ahead and made things easier for you, click below on either Google Play store or Apple App store to download.
        </p>

        <div class="text-center" style="display: flex; padding: 5px;">
            <a href="{{$appsData['urlIOS']}}" >
                <img style="width: 350px; height: 82px; padding-top: 15px" src="{{ $appsData['logoIOS'] }}" alt="{{ $appsData['titleIOS'] }}" name="{{ $appsData['name'] }}">
            </a>
            <a href="{{$appsData['urlGoogle']}}">
                <img style="width: 350px; height: 100px;" src="{{ $appsData['logoGoogle'] }}" alt="{{ $appsData['titleGoogle'] }}" name="{{ $appsData['name'] }}">
            </a>
        </div>

        <p style="text-align: center">
            On the Kinder m8 Family Lounge app you will be able to dive right into your child’s day by viewing their photos and videos as well as daily activities displaying their learning, monitor daily routine updates as well as make booking and view your fees and account information.
        </p>

        <h1 style="text-align: center;"> <strong>Securely sign your child in & out of the service</strong></h1>

        <p style="text-align: center">
            Learn to sign your child in and out with the Kinder m8 Kiosk.
        </p>

        <p style="text-align: center">
            To set up your pin code please enter your mobile number in on the login screen. When using the kiosk for the first time please enter 0000 (four zeros). You will then be asked to create your own unique pin code.
        </p>

        <p style="text-align: center">
            To allow for a faster sign in you can also sign your child in & out using your unique QR code which can be found on the home navigation within the Kinder m8 Family Lounge app.
        </p>

        <p style="text-align: left">We are here to help, feel free to reach out to us anytime at : <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

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
        @component('mail::footer', ['nomargin' => true, 'showsocial' => true])
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        @endcomponent
    @endslot

@endcomponent
