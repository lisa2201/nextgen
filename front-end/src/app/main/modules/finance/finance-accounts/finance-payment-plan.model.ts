import { Organization } from '../../organization/Models/organization.model';
import { Branch } from '../../branch/branch.model';
import { User } from '../../user/user.model';

export class FinancePaymentPlan {

    id: string;
    paymentFrequency: string;
    paymentDay?: string;
    activationDate?: string;
    billingTerm: string;
    fixedAmount?: number | null;
    amountLimit?: number | null;
    lastPaymentDate?: string;
    status: string;
    createdAt: string;
    nextPaymentDate: string;
    autoCharge: boolean;
    editHistory?: any;

    organization?: Organization;
    branch?: Branch;
    parent?: User;
    createdBy?: User;
    updatedAt: string;

    index: number;

    constructor(plan?: any, index?: number) {

        this.id = plan.id;
        this.paymentFrequency = plan.payment_frequency;
        this.paymentDay = plan.payment_day;
        this.activationDate = plan.activation_date;
        this.fixedAmount = plan.fixed_amount;
        this.nextPaymentDate = plan.next_generation_date;
        this.amountLimit = plan.amount_limit;
        this.lastPaymentDate = plan.last_generation_date;
        this.status = plan.status;
        this.createdAt = plan.created_at;
        this.billingTerm = plan.billing_term;
        this.autoCharge = plan.auto_charge ? true : false;
        this.updatedAt = plan.updated_at;
        this.editHistory = plan.history ? plan.history : [];

        this.organization = plan.organization ? new Organization(plan.organization) : null;
        this.branch = plan.branch ? new Branch(plan.branch) : null;
        this.parent = plan.parent ?  new User(plan.parent) : null;
        this.createdBy = plan.created_by ? new User(plan.created_by) : null;

        this.index = index || 0;
    }
       
}
