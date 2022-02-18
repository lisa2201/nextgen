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

        @if($booking_request->type === '1')
            <p>{{ $booking_request->child->fullname }}'s and Grace’s booking requests made from {{ $booking_request->start_date }} to {{ $booking_request->end_date }} has been {{ $booking_request->isAccepted() ? 'approved' : 'declined' }}.</p>
        @else
            <p>{{ $booking_request->child->fullname }}'s booking request made for {{ $booking_request->start_date }} has been {{ $booking_request->isAccepted() ? 'approved' : 'declined' }}.</p>
        @endif

        <p>Please log into KinderPay to manage the booking request.</p>

        @component('mail::button', ['url' => $url])
            Login to kinderm8
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
