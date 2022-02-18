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
        <p style="font-size: 21px;">Hello {{ $enrolmentObj->parent->full_name }},</p>

        <p><strong> {{ $enrolmentObj->organization->company_name }}, {{ $enrolmentObj->branch->name }} </strong>  has created a new CCS enrolment for <strong>{{ $enrolmentObj->child->full_name }}</strong>. Please login to the portal to confirm it.</p>

        @component('mail::button', ['url' => $url])
        Click to log in
        @endcomponent

        <p>If you received this email by mistake, simply delete it.</p>

        <p>For more clarification please contact: <br><a href="{{ \StaticUrls::kinderm8_support_link['url'] }}" target="_blank">{{ \StaticUrls::kinderm8_support_link['name'] }}</a></p>

        <p>Thank you,<strong> {{ $enrolmentObj->organization->company_name }}, {{ $enrolmentObj->branch->name }} </strong></p>
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
