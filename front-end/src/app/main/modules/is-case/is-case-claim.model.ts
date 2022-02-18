export interface ISCaseClaimResponse {
    TransactionId: string;
    ReturnCode: number;
    ReturnError?: any;
    ReturnMessage: string;
    LastPage: string;
    ListOfISCaseClaims: ListOfISCaseClaims;
}

export interface ListOfISCaseClaims {
    ISCaseClaim: ISCaseClaim[];
}

export interface ISCaseClaim {
    ApprovalId: string;
    ISCaseId: string;
    ISCaseClaimId: string;
    ServiceProviderISCaseClaimReference: string;
    WeekEnding: string;
    ISPaymentType: string;
    ServiceProvision: string;
    HoursClaimed: string;
    HoursPaid: string;
    GSTExclusiveAmount: number;
    ISCaseClaimStatus: string;
    CreateAuthorisedPersonFirstName: string;
    CreateAuthorisedPersonLastName: string;
    CreateAuthorisedPersonId: string;
    CreateDate: string;
    CancelAuthorisedPersonFirstName?: string;
    CancelAuthorisedPersonLastName?: string;
    CancelAuthorisedPersonId?: string;
    CancelDate?: string;
    AdditionalEducatorDeclaration: string;
    ISCaseType: string;
    ListOfAdditionalEducators: ListOfAdditionalEducators;
    ListOfEnrolments?: ListOfEnrolments;
    ListOfPayments?: ListOfPayment;
    CalculationDetails?: string;
}

export interface ListOfPayment {
    Payment: Payment[];
}

export interface Payment {
    PaymentLineItemId: string;
    ClearingNumber: string;
    PayeeId: string;
    DatePaid: string;
    FinancialYear: string;
    InvoiceNumber: string;
    OrganisationInvoiceNumber: string;
    PaymentType: string;
    RemittanceDescription: string;
    ProcessingDate: string;
    GSTExclusiveAmount: number;
    GSTInclusiveAmount: number;
    PaymentOrRefund: string;
    CaseId: string;
    CaseClaimId: string;
    OffsetIndicator?: string;
}

export interface ListOfAdditionalEducators {
    AdditionalEducators: AdditionalEducator[];
}

export interface ListOfEnrolments {
    Enrolment: Enrolement[];
}

export interface Enrolement {
    EnrolmentId: string;
}

export interface AdditionalEducator {
    AdditionalEducatorId: string;
    AdditionalEducatorFirstName: string;
    AdditionalEducatorLastName: string;
    AdditionalEducatorHours: string;
    CareDate: string;
}
