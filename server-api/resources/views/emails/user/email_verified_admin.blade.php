
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

<p><strong>{{ ucwords($org->company_name) }}</strong> has a new subscription to Kinder m8. Please login to portal to approve this subscription.</p>

@component('mail::button', ['url' => $url])
    Go to portal
@endcomponent

<p>Thanks,<br> {{ $emailData['name'] }}</p>
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
