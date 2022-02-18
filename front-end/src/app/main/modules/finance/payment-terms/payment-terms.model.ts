
import { Branch } from '../../branch/branch.model';
import { Organization } from '../../organization/Models/organization.model';
import { User } from '../../user/user.model';

export class PaymentTerm {

    id: string;
    name: string;
    startDate: string;
    endDate: string;
    paymentGenerationDate: string;
    transactionGenerationDate: string;
    status: boolean;
    
    organization?: Organization;
    branch?: Branch;
    createdBy?: User;

    index: number;

    constructor(item?: any, index?: number) {

        this.id = item.id;
        this.name = item.name;
        this.startDate = item.start_date;
        this.endDate = item.end_date;
        this.paymentGenerationDate = item.payment_generation_date;
        this.transactionGenerationDate = item.transaction_generation_date;
        this.status = item.status;

        this.organization = item.organization ? new Organization(item.organization) : null;
        this.branch = item.branch ? new Branch(item.branch) : null;
        this.createdBy = item.created_by ? new User(item.created_by) : null;

        this.index = index || 0;
    }

}