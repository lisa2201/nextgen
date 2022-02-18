import { Branch } from 'app/main/modules/branch/branch.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { User } from 'app/main/modules/user/user.model';


export class FinanceParentExclusion {

    id: string;
    startDate: string;
    endDate: string;
    bookingFee: boolean;
    parentPayment: boolean;
    ccsPayment: boolean;
    
    parent?: User;
    organization?: Organization;
    branch?: Branch;

    index: number;

    constructor(exclusion?: any, index?: number) {

        this.id = exclusion.id;
        this.startDate = exclusion.start_date;
        this.endDate = exclusion.end_date;
        this.bookingFee = exclusion.booking_fee;
        this.parentPayment = exclusion.parent_payment;
        this.ccsPayment = exclusion.ccs_payment;

        this.organization = exclusion.organization ?  new Organization(exclusion.organization) : null;
        this.branch = exclusion.branch ? new Branch(exclusion.branch): null;
        this.parent = exclusion.parent ?  new User(exclusion.parent): null;

        this.index = index || 0;
    }
       
}
