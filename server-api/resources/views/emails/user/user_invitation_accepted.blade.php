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

        <p>Hi, <strong>{{ $user->full_name }}</strong>,</p>

        <p>Thank you for choosing our online application!.</p>

        @if($is_owner_request)
            @component('mail::button', ['url' => PathHelper::getSiteManagerPath($full_path)])
                Let's Customise Your Application
            @endcomponent
        @else
            @if(count($urls) > 1)
                <p>Please choose one of the links below to start with.</p>
                <ul>
                    @foreach($urls as $domain)
                        <li>
                            <a href="{{ $domain }}" target="_blank">{{ $domain }}</a>
                        </li>
                    @endforeach
                </ul>
            @else
                @component('mail::button', ['url' => $urls[0]])
                    Let's Start
                @endcomponent
            @endif

            @if($pincode != '')
                <p>Your mobile login pin is <b>"{{ $pincode }}".</b> </p>
            @endif
        @endif

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
