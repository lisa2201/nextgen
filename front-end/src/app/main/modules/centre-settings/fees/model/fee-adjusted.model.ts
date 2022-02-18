import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { User } from 'app/main/modules/user/user.model';

export class AdjustedFee
{
    id?: string;
    netAmount: number;
    grossAmount: number;
    effectiveDate: string;
    status: string;
    isFutureBookingsUpdated: boolean;
    deletedAt?: string; 
    createdAt?: string; 
    updatedAt?: string;
    creator?: User;

    editable?: boolean;
    index?: number;

    /**
     * Constructor
     *
     * @param {*} [room]
     * @param {number} [index]
     */
    constructor(adjustedFee?: any, index?: number)
    {
        this.id = adjustedFee.id || '';
        this.netAmount = parseFloat(adjustedFee.net_amount) || 0;
        this.grossAmount = parseFloat(adjustedFee.gross_amount) || 0;
        this.effectiveDate = adjustedFee.effective_from || '';
        this.status = adjustedFee.status || '';
        this.isFutureBookingsUpdated = adjustedFee.is_bookings_updated || false;
        this.createdAt = adjustedFee.created_on || null;
        this.updatedAt = adjustedFee.updated_on || null;
        this.deletedAt = adjustedFee.deleted_on || null;
        this.creator = (adjustedFee.creator && !_.isNull(adjustedFee.creator)) ? new User(adjustedFee.creator) : null;

        this.editable = adjustedFee.editable;
        this.index = index || 0;
    }

    /**
     * check if adjusted fee is active
     *
     * @returns {boolean}
     */
    isActive(): boolean
    {
        return this.status === '0';
    }

    /**
     * get fee amount based on effective date
     *
     * @param {string} [date=null]
     * @returns {number}
     */
    getEffectiveFeeAmount(date: string = null): number
    {
        return (!_.isNull(date)) 
            ? DateTimeHelper.isSameOrBefore(DateTimeHelper.parseMoment(this.effectiveDate), DateTimeHelper.parseMoment(date)) ? this.netAmount : 0
            : this.netAmount
    }
}