@component('mail::layout')

    <?php
        $emailData = EmailHelper::getMailTemplateProps(Kinderm8\Enums\RoleType::ORGADMIN);
    ?>

    {{-- Header --}}
    @slot('header')
        @component('mail::header', ['url' => config('app.url'), 'class' => 'blue'])
            <div class="text-center">
            <img src="{{$branch_logo!=''?$branch_logo: $emailData['logo'] }}" alt="{{ $emailData['title'] }}" name="{{ $emailData['name'] }}" class="logo-header">
            </div>
        @endcomponent
    @endslot

    {{-- Body --}}
    @slot('subcopy')
        <p>Hi <strong>{{$enquiryObj->enquiry_info['firstname']}} {{$enquiryObj->enquiry_info['lastname']}}</strong>,</p>

        <p> To complete your waitlist application please click on the 'Join waitlist' button below. Please complete and save the details in order to complete the waitlist process. </p>

        @component('mail::button', ['url' => $url])
            Join waitlist
        @endcomponent
        {{-- <a href="{{$url}}"> Enroll here </a> --}}


        <p>Thank you,<br> {{ $branch_name }}</p>
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
