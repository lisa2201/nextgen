import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';
import { ProviderSetup } from '../account-manager/provider-setup/models/provider-setup.model';

export class AlternativePayment {


    id: string;
    alternativePaymentArrangementID: string;
    properties: object;
    createdBy: string;
    is_synced: string;
    error: object;
    deleted_at:any;

    provider?: ProviderSetup;

    /**
     * Constructor
     * 
     * @param {*} [data]
     * @param {number} [index]
     */
    constructor(data?: any) 
    {
        this.id = data.id || '';
        this.alternativePaymentArrangementID = data.alternativePaymentArrangementID || '';
        this.properties = data.properties || '';
        this.createdBy = data.createdBy || '';
        this.is_synced = data.is_synced || '';
        this.error = data.error || '';

        this.provider = data.provider ? new ProviderSetup(data.provider) : null;

    }
}
