@component('mail::layout')

    <?php
        $emailData = EmailHelper::getMailTemplateProps(Kinderm8\Enums\RoleType::ORGADMIN);
    ?>

    {{-- Header --}}
    @slot('header')
        @component('mail::header', ['url' => config('app.url'), 'class' => 'blue'])
            <div class="text-center">
                <img src="{{ $branch_logo!=''?$branch_logo: $emailData['logo'] }}" alt="{{ $emailData['title'] }}" name="{{ $emailData['name'] }}" class="logo-header">
            </div>
        @endcomponent
    @endslot

    {{-- Body --}}
    @slot('subcopy')
        <p>Hi <strong>{{$enrolObj->waitlist_info['parent_firstname']}} {{$enrolObj->waitlist_info['parent_lastname']}}</strong>,</p>

        <p> Please click on the below 'Enrol now' button to complete your enrolment at {{$branch_name}} , </p>


        @component('mail::button', ['url' => $url])
            Enrol now
        @endcomponent
        {{-- <a href="{{$url}}"> Enroll here </a> --}}


        <p>Thanks,<br> {{ $branch_name }}</p>
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
