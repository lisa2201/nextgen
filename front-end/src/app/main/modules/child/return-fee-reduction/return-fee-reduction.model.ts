import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';

export class ReturnFeeReduction {

    id: string;
    properties: object;
    returnFeeReductionID: string;
    createdBy: string;
    is_synced: string;
    error?: any;
    deleted_at:any;
    cancelReturnFeeReductionReason: string;
    /**
     * Constructor
     * 
     * @param {*} [data]
     * @param {number} [index]
     */
    constructor(data?: any) 
    {
        this.id = data.id || '';
        this.properties = data.properties || '';
        this.returnFeeReductionID = data.returnFeeReductionID || '';
        this.createdBy = data.createdBy || '';
        this.is_synced = data.is_synced || '';
        this.error = data.error || '';
        this.cancelReturnFeeReductionReason = data.cancelReturnFeeReductionReason || '',
        this.deleted_at = data.deleted_at || '';
    }
}
