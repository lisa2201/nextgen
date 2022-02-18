<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class CCSType extends Enum
{
    const CCS_STATUS_MAP = [
        'APPROV' => 'Approved',
        'CEASED' => 'Ceased',
        'CONFIR' => 'Confirmed',
        'DISPUT' => 'Disputed',
        'MANUAL' => 'Manual Review',
        'NOTAPP' => 'Not Approved',
        'PENDEL' => 'Pending Eligibility',
        'PENDIN' => 'Pending Confirmation',
        'RECEIV' => 'Received',
        'REJECT' => 'Rejected',
        'WITHDR' => 'Withdrawn',
        'NONE' => 'Not Submitted',
        'RE_ENROL' => 'Re-enrolled'
    ];

    const ENROLMENT_SESSION_UNIT_OF_MEASURE_MAP = [
        '0' => 'SESSIO',
        '1' => 'HOUR'
    ];

    const ENROLMENT_SESSION_UNIT_OF_MEASURE = [
        'SESSIO' => 'Per Session',
        'HOUR' => 'Per Hour'
    ];

    const ENROLMENT_SESSION_INDICATOR = [
        'R' => 'Regular',
        'C' => 'Casual'
    ];

    const ENROLMENT_SESSION_TYPE_MAP = [
        '0' => 'ROUTIN',
        '1' => 'CASUAL'
    ];

    const ENROLMENT_SESSION_TYPE = [
        'R' => 'Regular',
        'C' => 'Casual',
        'B' => 'Routine And Casual'
    ];

    const ENROLMENT_ARRANGEMENT_TYPE = [
        'CWA' => 'Complying Written Arrangements (CWA)',
        'RA' => 'Relevant Arrangements (Do Not Want CCS)',
        'ACCS' => 'Child Wellbeing (ACCS)',
        'PEA' => 'Provider Eligible Arrangements (PEA)',
        'OA' => 'Arrangement With Another Organization'
    ];

    const ENROLMENT_PEA_REASON = [
        'NONE' => 'None',
        'NOCARE' => 'Service not able to identify a CCS eligible carer',
        'FOSKIN' => 'Child is in formal foster/kinship care'
    ];

    const BOOKING_ABSENCE_REASON = [
        'NONE' => 'None',
        'Z10001' => 'Child ill',
        'Z10002' => 'Individual caring for child is ill',
        'Z10003' => 'Partner of individual caring for child is ill',
        'Z10004' => 'Individual who lives with child is ill',
        'Z10005' => 'Child attending pre-school',
        'Z10006' => 'Pupil free day',
        'Z10007' => 'Court order or parenting order in place',
        'Z10008' => 'Local emergency – service closed',
        'Z10009' => 'Local emergency – unable to attend',
        'Z10010' => 'Local emergency – child’s carer does not wish child to attend',
        'Z10011' => 'Not immunised against particular infectious disease and absence during grace per',
        'P10001' => 'Prescribed - Service has changed ownership',
        'P10002' => 'Prescribed - Usual service closed and child attending different service under the same provider',
        'P10003' => 'Prescribed - CCSEnrolment ceased incorrectly',
        'P10004' => 'Prescribed – Family tragedy'
    ];

    /*------------------------- Session Report -----------------------------*/

    const SESSION_SUBMISSION_ACTION = [
        'INIT' => 'Initial',
        'VARY' => 'Vary/Substitute',
        'NOCHG' => 'No Change',
        'NOCARE' => 'No Care Provided'
    ];

    const SESSION_REASON_FOR_CHANGE = [
        //'NONE' => 'Not applicable',
        'ADMIN' => 'Administrative error',
        'PARDIS' => 'Responding to parent dispute',
        'GENAMD' => 'General Amendment',
        'SECCOR' => 'Secretary making corrections (204C(5)) (Internal use only)',
        'SECOTH' => 'Secretary other facts for calculation purposes(67CD(2)) (Internal use only)',
        'RE204C' => 'Responding to 204C'
    ];

    const SESSION_WITHDRAW_REASON_FOR_CHANGE = [
        //'NONE' => 'Not applicable',
        'ADMIN' => 'Administrative error',
        'PARDIS' => 'Responding to parent dispute',
        'SECCOR' => 'Secretary making corrections (204C(5)) (Internal use only)',
        'SECOTH' => 'Secretary other facts for calculation purposes(67CD(2)) (Internal use only)',
        'RE204C' => 'Responding to 204C'
    ];

    const SESSION_REPORT_STATUS = [
        'NONE' => 'Processing',
        'APPROV' => 'Approved',
        'DISPTA' => 'Disputed After Payment',
        'DISPTB' => 'Disputed Before Payment',
        'MANUAL' => 'Manual Review',
        'NOPROC' => 'Not to be Processed',
        'NOTAPP' => 'Not Approved',
        'PROCES' => 'Processed',
        'RECEIV' => 'Received',
        'REPLAC' => 'Replaced',
        'WITHDR' => 'Withdrawn',
        'WITNAP' => 'Withdraw Not Approved',
        'NOCHAN' => 'No Change by Provider',
        'REVDIS' => 'Reverse Dispute'
    ];

    const SESSION_IS_PRE_SCHOOL_PROGRME = [
        'NONE' => 'Not populated',
        'Y' => 'Yes',
        'N' => 'No'
    ];

    const SESSION_REPORT_LOCKED = [
        'Y' => 'Yes',
        'N' => 'No'
    ];

    /*------------------------- CCS Service -----------------------------*/

    const SERIVCE_TYPE = [
        'ZCDC' => 'Centre based Day Care',
        'ZFDC' => 'Family Day Care',
        'ZOSH' => 'Outside School Hours Care',
        'ZIHC' => 'In Home Care'
    ];
}
