<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class NavigationActionType extends Enum
{
    const ACTION_TYPE_VIEW = 'AC0';
    const ACTION_TYPE_CREATE = 'AC1';
    const ACTION_TYPE_EDIT = 'AC2';
    const ACTION_TYPE_DELETE = 'AC3';

    const ACTION_TYPE_APROVE = 'AC4';
    const ACTION_TYPE_DISAPROVE = 'AC5';

    const ACTION_TYPE_UPLOAD = 'AC6';

    const ACTION_TYPE_SUBMIT = 'AC7';

    //for fees adjust and archive
    const ACTION_TYPE_ADJUST = 'AC8';
    const ACTION_TYPE_ARCHIVE = 'AC9';

    // For payment
    const ACTION_TYPE_PAY = 'AC10';

    // session submission
    const ACTION_TYPE_WITHDRAW = 'AC11';

    // view child permission with same permission dashboard
    const ACTION_TYPE_VIEW_CHILD = 'AC12';
    const ACTION_TYPE_VIEW_PAYMENT_SUMMARY_WIDGET = 'AC13';
}
