
import * as _ from 'lodash';
import { Organization } from 'app/main/modules/organization/Models/organization.model';

export class SubscriberInvoice {

    id: string;
    number: string;
    startDate: string;
    endDate: string;
    dueDate: string;
    subTotal: number;
    createdOn: string;
    status: string;

    organization?: Organization;
    invoiceItems: SubscriberInvoiceItem[];

    index?: number;

    constructor (data: any, index?: number) {

        this.id = data.id;
        this.number = data.number;
        this.startDate = data.start_date;
        this.endDate = data.end_date;
        this.dueDate = data.due_date;
        this.subTotal = data.subtotal;
        this.createdOn = data.created_on;
        this.status = data.status;

        this.organization = data.organization ? new Organization(data.organization) : null;
        this.invoiceItems = data.invoice_items ? _.map(data.invoice_items, (item: any, ind: number) => new SubscriberInvoiceItem(item, ind)) : null;

        this.index = index || 0;

    }

    setStatus(value: string): void {
        this.status = value;
    }

}

export class SubscriberInvoiceItem {

    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    unit: string;
    status: boolean;
    createdAt: string;

    orgSubscription?: any;

    index?: number;

    constructor (data: any, index?: number) {

        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.price = data.price;
        this.quantity = data.quantity;
        this.unit = data.unit;
        this.status = data.status === '0' ? true: false;
        this.createdAt = data.created_at;

        this.orgSubscription = data.org_subscription ? data.org_subscription : null;

        this.index = index || 0;

    }

}
