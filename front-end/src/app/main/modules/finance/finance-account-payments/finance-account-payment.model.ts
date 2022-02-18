import { User } from '../../user/user.model';
import { Organization } from '../../organization/Models/organization.model';
import { Branch } from '../../branch/branch.model';
import { Child } from '../../child/child.model';
import { ParentPaymentMethod } from '../parent-payment-method/parent-payment-method.model';

export class FinanceAccountPayment {

    id: string;
    paymenRef: string;
    transactionRef: string | null;
    amount: number;
    date: string;
    paymentExecutionType: string;
    paymentGenerationType: string;
    comments: string | null;
    status: string;
    manualPaymentType?: string | null;
    amountDue?: number | null;
    failReason?: string | null;
    settlementDate: string;
    
    
    organization?: Organization;
    branch?: Branch;
    parent?: User;
    paymentMethod?: ParentPaymentMethod;
    children?: Child[];
    createdAt?: string;

    index: number;

    constructor(item?: any, index?: number) {

        this.id = item.id;
        this.paymenRef = item.payment_ref;
        this.transactionRef = item.transaction_ref;
        this.amount = item.amount;
        this.date = item.date;
        this.paymentExecutionType = item.payment_execution_type;
        this.paymentGenerationType = item.payment_generation_type;
        this.comments = item.comments;
        this.status = item.status;
        this.manualPaymentType = item.manual_payment_type;
        this.amountDue = item.amount_due;
        this.failReason = item.fail_reason;
        this.createdAt = item.created_at;
        this.settlementDate = item.settlement_date;
        

        this.organization = item.organization ? new Organization(item.organization) : null;
        this.branch = item.branch ? new Branch(item.branch) : null;
        this.parent = item.parent ? new User(item.parent) : null;
        this.paymentMethod = item.payment_method ? item.payment_method : null;
        this.children = item.children ? item.children.map((val: any, idx: number) => new Child(val, idx)) : [];

        this.index = index || 0;
    }

    getParentPaymentStatusDescription(): string {
        
        let desc = '';

        switch (this.status) {
            case 'approved':
                desc = 'Approved';
                break;
            case 'pending':
                desc = 'Pending';
                break;
            case 'submitted':
                desc = 'Submitted';
                break;
            case 'completed':
                desc = 'Completed';
                break;
            case 'rejected_gateway':
                desc = 'Rejected by gateway';
                break;
            case 'rejected_user':
                desc = 'Rejected by user';
                break;
            case 'refund_success':
                desc = 'Refund Success';
                break;
            case 'refund_failed':
                desc = 'Refund Failed';
                break;
            case 'inactive':
                desc = 'Inactive';
                break;

            default:
                desc = '';
                break;

        }

        return desc;

    }

}
