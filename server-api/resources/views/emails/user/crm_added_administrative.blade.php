@component('mail::layout')

    <?php
    $emailData = EmailHelper::getMailTemplateProps(Kinderm8\Enums\RoleType::ORGADMIN);
    ?>

    {{-- Header --}}
    @slot('header')
        @component('mail::header', ['url' => config('app.url'), 'class' => 'blue'])
            <div class="text-center">
                <img src="{{ $emailData['logo'] }}" alt="{{ $emailData['title'] }}" name="{{ $emailData['name'] }}"
                     class="logo-header">
            </div>
        @endcomponent
    @endslot

    {{-- Body --}}
    @slot('subcopy')
        <p>Hi, <strong>{{ $user->first_name }}</strong>,</p>

        <p>A new {{ucwords($form)}} for {{$branch->name}} has been submitted.</p>
        <p>Please login to Kinder m8 to view it.</p>
        <p>Thanks,<br> {{ 'Kinder m8' }}</p>


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
