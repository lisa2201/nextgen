import { Organization } from '../../organization/Models/organization.model';
import { Branch } from '../../branch/branch.model';

export interface ParentPaymentProviderConfig {
    name: string;
    description: string;
    value: string;
}

export class ParentPaymentProvider {

    id: string;
    paymentType: string;
    configuration: ParentPaymentProviderConfig[];
    status: boolean;
    createdAt: string;
    updatedAt: string;

    organization?: Organization | null;
    branch?: Branch | null;

    index?: number;
    isNew?: boolean;
    isLoading?: boolean;

    constructor(provider?: any, index?: number) {
        
        this.id = provider.id;
        this.paymentType = provider.payment_type;
        this.configuration = provider.configuration;
        this.status = provider.status;
        this.createdAt = provider.created_at;
        this.updatedAt = provider.updated_at;
        
        this.organization = provider.organization ? new Organization(provider.organization) : null;
        this.branch = provider.branch ? new Branch(provider.branch) : null;

        this.index = index || 0;
        this.isNew = false;
        this.isLoading = false;

    }

    setStatus(val: boolean): void {
        this.status = val;
    }

}
