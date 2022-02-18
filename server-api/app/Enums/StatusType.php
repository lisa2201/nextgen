<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class StatusType extends Enum
{
    const PENDING = "pending";
    const EMAIL_VERIFY = "email_verification";
    const QUOTATION_ACCEPT = "quotation_acceptance";
    const ACTIVE = "active";
    const DEACTIVE = "deactivate";

    const PAY_FREE = "on_free";
    const PAY_TRIAL = "on_trial";
    const PAY_PAID = "on_paid";
    const PAY_FAILED = "on_payment_failed";

    const INVOICE_PENDING = 'pending';
    const INVOICE_PAID = 'paid';
    const INVOICE_FAILED = 'failed';
    const INVOICE_PAST_DUE = 'past_due';
}
