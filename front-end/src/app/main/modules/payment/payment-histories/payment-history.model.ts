
export class PaymentHistory {

    id: string;
    amount: number;
    date: string;
    paymentType: string;
    status: string;
    transactionRef?: string;
    paymentRef?: string;
    properties?: object;
    organization?: object;
    invoice?: object;
    paymentMethod?: object;

    index: number;

    constructor(paymentHistory?: any, index?: number) {

        this.id = paymentHistory.id;
        this.amount = paymentHistory.amount;
        this.paymentType = paymentHistory.payment_type;
        this.status = paymentHistory.status;
        this.date = paymentHistory.date;
        this.transactionRef = paymentHistory.transaction_ref ? paymentHistory.transaction_ref : null;
        this.paymentRef = paymentHistory.payment_ref ? paymentHistory.payment_ref : null;
        this.properties = paymentHistory.properties ? paymentHistory.properties : null;
        this.organization = paymentHistory.organization ? paymentHistory.organization : null;
        this.invoice = paymentHistory.invoice ? paymentHistory.invoice : null;
        this.paymentMethod = paymentHistory.payment_method ? paymentHistory.payment_method : null;

        this.index = index || 0;

    }


}