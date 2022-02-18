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
<h1>Welcome to {{ $emailData['name'] }}</h1>

<p>Hi, <strong>{{ $organization->company_name }}</strong>,</p>

<p>Thank you for subscribing Kinderm8 child care solutions.</p>
<p>You can now access the Site Manager using the below link.</p>

@component('mail::button', ['url' => $url])
Login to Sitemanager
@endcomponent

<p>For more clarification, please contact : <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>
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
