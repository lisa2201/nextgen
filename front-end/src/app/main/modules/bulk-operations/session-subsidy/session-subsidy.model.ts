import { Child } from '../../child/child.model';


export interface Subsidy {
    serviceID: string;
    enrolmentID: string;
    totalAbsenceDays: string;
    sessionReportStartDate: string;
    initialSubmittedDateTime: string;
    sessionReportProcessingStatus: string;
    weeklyFeeChargedByService: string;
    weeklyHoursInCare: string;
    weeklyEntitlementAmount: string;
    weeklySubsidisedHours: string;
    weeklyPreschoolSubsidisedHours: string;
    SessionOfCares: SessionOfCaresResult;
    child?: any
}

export interface SessionOfCaresResult {
    results: SessionOfCares[];
}

export interface SessionOfCares {
    date: string;
    startTime: string;
    endTime: string;
    totalHoursInSession: string;
    sessionAmountCharged: string;
    hourlyAmountCharged: string;
    Entitlements: EntitlementsResult;
}

export interface EntitlementsResult {
    results: EntitlementObject[];
}

export interface EntitlementObject {
    processedDateTime: string;
    type: string;
    amount: string;
    subsidisedHours: string;
    recipient: string;
    reason: string;
}