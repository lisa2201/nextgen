<?php

use Kinderm8\EmailVerification;
use Kinderm8\Enums\StatusType;
use Kinderm8\Notifications\SendQuotationVerification;
use Kinderm8\Organization;
use Kinderm8\QuotationVerification;

class ValidationHelper
{
    public static function organizationStatusViolation(Organization $org, $fullUrl)
    {
        if ($org->status === StatusType::ACTIVE) {
            // Active subscriber
            return [
                'button' => true,
                'button_title' => 'Go to site manager',
                'status' => 'active',
                'url' => PathHelper::getSiteManagerPath($fullUrl),
                'message' => 'This email already exists and has active subscription, please login to site manager to use the system.'
            ];
        } elseif ($org->status === StatusType::PENDING) {
            // Pending email verification

            $emailVerify = EmailVerification::where('user_id', $org->user->id)->get()->first();

            return [
                'button' => true,
                'button_title' => 'Resend email',
                'status' => 'email_verification',
                'url' => $emailVerify->token,
                'message' => 'This email already exists and the email verification is pending. Please verify your email by clicking the link sent in the email. If you did not recieve the email, please click the button below to resend the verification email.'
            ];
        } elseif ($org->status === StatusType::EMAIL_VERIFY) {
            // Pending approval
            return [
                'button' => false,
                'button_title' => 'Pending Approval',
                'status' => 'pending_approval',
                'message' => 'This email already exists and pending approval from administrator. You will be notified once the account is approved.'
            ];
        } elseif ($org->status === StatusType::QUOTATION_ACCEPT) {
            // Pending quotation acceptance

            $quotationAccept = QuotationVerification::where('organization_id', $org->id)->get()->first();

            return [
                'button' => true,
                'button_title' => 'Resend quotation',
                'status' => 'quotation_acceptance',
                'url' => $quotationAccept->token,
                'message' => 'This email already exists and the quotation acceptance is pending. Please acccept your email by clicking the link sent in the email. If you did not recieve the email, please click the button below to resend the verification email.'
            ];
        } elseif ($org->status === StatusType::DEACTIVE) {
            // deactivated subscriber
            return [
                'button' => false,
                'status' => 'deactivate',
                'url' => null,
                'message' => 'This email already exists and has deactived subscription. Please contact the Kinderm8 admin'
            ];
        } else {
            return null;
        }
    }
}
