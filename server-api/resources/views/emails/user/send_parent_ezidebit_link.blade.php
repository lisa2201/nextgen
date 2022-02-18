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

        <p>Please click the link below to setup your payment method with Ezidebit.</p>

        @component('mail::button', ['url' => $url])
            Setup Payment Method
        @endcomponent

        <p>For more clarification, please contact : <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

        <p>Thanks,<br> {{ $user->branch->name }}</p>
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
