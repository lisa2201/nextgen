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
<p>Hi, <strong>{{ $organization->company_name }}</strong>,</p>

<p>Kindly refer the below quotation with the agreed subscriber pricing plan for Kinder m8 Parent’s portal. Please verify quotation to confirm your subscription.</p>

<p>Organization Name: <strong>{{ $organization->company_name }}</strong></p>
<p>Billing Frequency: <strong>{{ $organization->payment_frequency }}</strong>,</p>


<table border="1">

    <tr>
        <th>Addon</th>
        <th>Billing Type</th>
        <th>Price per quantity</th>
        <th>Minimum Price</th>
    </tr>
    @foreach($subscriptions as $item)
    <tr>
        <td>{{ $item->addon_id }}</td>
        <td>{{ $item->unit_type }}</td>
        <td>{{ $item->price }}</td>
        <td>{{ $item->minimum_price }}</td>
    </tr>
    @endforeach
</table>
<br>
<p>Please verify this quotation within 30 days. This link is only valid till the <strong>{{$code->expires_at}}</strong>.</p>

@component('mail::button', ['url' => $url])
Click here to verify the quotation.
@endcomponent

<p>If you received this email by mistake, simply delete it. You want be subscribed if you don't click the confirmation link above.</p>

<p>For more clarification, please contact : <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

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
@component('mail::footer', ['nomargin' => true, 'showsocial' => true])
&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
@endcomponent
@endslot

@endcomponent
