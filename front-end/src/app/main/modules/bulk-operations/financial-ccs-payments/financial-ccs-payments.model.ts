export interface PaymentItem {
    enrolmentID: string;
    sessionReportStartDate: string;
    documentNumber: string;
    lineItemNumber: string;
    subLineItemNumber: string;
    postingDate: string;
    fiscalYearPaymentRequested: string;
    mainTransactionCode: string;
    mainTransaction?: string;
    subTransactionCode: string;
    subTransaction?: string;
    GSTcode: string;
    gst?: string;
    amount: string;
    status: string;
    childName?: string;
    parentName?: string;
}

export interface PaymentItems {
    results: PaymentItem[];
}

export interface ErrorCodes {
    results: any[];
}

export interface Payment {
    serviceID: string;
    serviceName: string;
    clearingDocumentNumber: string;
    clearingDocumentDate: string;
    clearingReason: string;
    paymentFiscalYear: string;
    totalAmount: string;
    paymentBSB: string;
    paymentAccountNumber: string;
    paymentAccountName: string;
    Items: PaymentItems;
    ErrorCodes: ErrorCodes;
}

export interface CCSPayments {
    count: number,
    results: Payment[];
}