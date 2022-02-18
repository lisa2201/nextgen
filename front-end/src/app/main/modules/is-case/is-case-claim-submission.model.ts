import { WeekDayArrayObject, ISCase } from './is-case.model';

export interface ISCaseClaimSubmission {
    id: string;
    case_claim_reference: string;
    case_id: string;
    hours_claimed: string;
    payment_type: string;
    service_provision: string;
    is_case?: ISCase | null;
    status: string;
    transaction_id?: string | null;
    week_ending: string;
    week_days?: WeekDayArrayObject[] | null;
    enrolments?: string[] | null;
    fail_reason?: string | null;
    created_at: string;
}
