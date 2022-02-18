export interface ISCaseResponse {
    TransactionId: string;
    ReturnCode: number;
    ReturnError?: any;
    ReturnMessage: string;
    LastPage: string;
    ListOfISCases: ListOfISCases;
}

export interface ListOfISCases {
    ISCase: ISCase[];
}

export interface ISCase {
    ISCaseId: string;
    ApprovalId: string;
    StartDate: string;
    EndDate: string;
    Type: string;
    CaseServiceType: string;
    DateLastWithdrawn?: string;
    DateLastReactivated: string;
    Status: string;
    TotalISNonFaceToFaceHrsAllowed: string;
    ISNonFaceToFaceHrsBalance: string;
    CareProvision: string;
    CareEnvironmentName: string;
    IPFirstName: string;
    IPLastName: string;
    ListOfCarers?: any;
    ListOfDays: ListOfDays;
    ListOfCareHours: ListOfCareHours;
    ListOfSupportHours: ListOfSupportHours;
    ListOfISEnrolments?: ListOfISEnrolment;
    DateLastInactivated?: string;
}

export interface ListOfISEnrolment {
    ISEnrolment: ISEnrolment[];
}

export interface ISEnrolment {
    EnrolmentId: string;
    ServiceProviderEnrolmentReference?: any;
    ChildId: string;
    ChildServiceClientId?: any;
    ChildCRN: string;
    ChildDateOfBirth: string;
    ChildName?: string;
}

export interface ListOfSupportHours {
    SupportHours: SupportHour[];
}

export interface SupportHour {
    PaymentType: string;
    Period: string;
    Hours: string;
    Tolerance?: string;
    Balance?: string;
}

export interface ListOfCareHours {
    CareHours: CareHour[];
}

export interface CareHour {
    DayOfCare: string;
    PaymentType: string;
    DayHours: string;
}

export interface ListOfDays {
    Day: Day[];
}

export interface Day {
    ChildId: string;
    DayOfCare: string;
    PaymentType: string;
    VariableWeek: string;
    ChildName?: string;
}

export interface SelectInterface {
    name: string;
    value: string;
}

export interface WeekDayArrayObject {
    day: string;
    date: string | null;
    educatorArray: EducatorArrayObject[];
    totalTime: string;
}

export interface EducatorArrayObject {
    ccs_id: string | null;
    educator_id: string;
    first_name: string;
    last_name: string;
    hours_claimed: string;
}

export interface MinimumEducatorMap {
    serviceType: string;
    caseType: string;
    paymentType: string;
    minimumEducators: number;
    rejectionDays: number;
}
