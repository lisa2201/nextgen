import * as _ from 'lodash';

import { Room } from 'app/main/modules/room/models/room.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AdjustedFee } from './fee-adjusted.model';

export class Fee 
{
    id?: string;
    name?: string;
    type?: string;
    status: string;
    vendor?: string;
    visible?: string;
    sessionStart?: number;
    sessionEnd?: number;
    frequency?: string;
    adjust?: number;
    netAmount?: number;
    grossAmount?: number;
    archivedDate?: string;
    eDate?: string;
    rooms?: Room[];
    adjustedFee?: AdjustedFee[]; 
    adjustedFeeFuture?: AdjustedFee[]; 
    
    editable?: boolean;
    index?: number;

    /**
     * Constructor
     *
     * @param {*} [room]
     * @param {number} [index]
     */
    constructor(fee?: any, index?: number)
    {
        this.id = fee.id || '';
        this.name = fee.name || '';
        this.type = fee.type || '';
        this.status = fee.status || '';
        this.sessionStart = fee.session_start || null;
        this.sessionEnd = fee.session_end || null;
        this.adjust = fee.adjust || null;
        this.visible = fee.visible || '';
        this.frequency = fee.frequency || '';
        this.netAmount = parseFloat(fee.net_amount) || 0;
        this.grossAmount = parseFloat(fee.gross_amount) || 0;
        this.vendor = fee.vendor_name || '';
        this.archivedDate = fee.status === '1' ? fee.updated_at : '';
        this.eDate = fee.effective_date ? fee.effective_date : '';
        this.rooms = fee.rooms ? fee.rooms.map((i: any, idx: number) => new Room(i, idx)) : [];
        this.adjustedFee = fee.adjusted_current ? fee.adjusted_current.map((i: any, idx: number) => new AdjustedFee(i, idx)) : [];
        this.adjustedFeeFuture = fee.adjusted_next ? fee.adjusted_next.map((i: any, idx: number) => new AdjustedFee(i, idx)) : [];
        this.editable = fee.editable;

        this.index = index || 0;
    }

    isCasual(): boolean
    {
        return this.type === '1'
    }

    getExpiredLabel(): string 
    {
        return '<img src="assets/icons/flat/ui_set/custom_icons/' + (this.status === '0' ? 'checked.svg' : 'archive.svg') + '" class="table-svg-icon"/>';
    }

    getSessionHours(): number
    {
        return (this.sessionEnd - this.sessionStart) / 60;
    }

    getSessionDuration(): string
    {
        const hours = Math.floor((this.sessionEnd - this.sessionStart) / 60);
        const mins = Math.floor((this.sessionEnd - this.sessionStart) % 60);

        return `${hours}.${mins}`;
    }

    getType(): string 
    {
        return this.type === '0' ? 'Routine' : 'Casual';
    }

    getFrequency(): string 
    {
        return this.frequency === '0' ? 'Daily' : 'Hourly';
    }

    getVendor(): string 
    {
        return this.vendor === '0' ? 'Australian CCS' : 'None';
    }

    hasSession(): boolean
    {
        return this.frequency === '0';
    }

    getRooms(): any
    {
        return this.rooms.length > 0 ? this.rooms.map(i => i.title).join('\r\n') : 'N/A';
    }

    isArchived(): boolean
    {
        return this.status === '1';
    }

    /*------------------------------*/

    getCurrentAdjusted(): AdjustedFee
    {
        return !_.isEmpty(this.adjustedFee) ? _.head(this.adjustedFee) : null;
    }

    getFutureAdjusted(): AdjustedFee
    {
        return !_.isEmpty(this.adjustedFeeFuture) ? _.head(this.adjustedFeeFuture) : null;
    }

    getFeeAmount(date: any = null): number
    {
        return this.getCurrentAdjusted() ? this.getCurrentAdjusted().netAmount : this.netAmount;
    }

    getAllAdjustedFees(): AdjustedFee[]
    {
        return [...this.adjustedFee, ...this.adjustedFeeFuture];
    }

    getClosetedAdjustedFee(): AdjustedFee
    {
        const dates = this.adjustedFee.map(i => DateTimeHelper.parseMoment(i.effectiveDate).toDate());

        if (_.isEmpty(dates) || (!_.isEmpty(dates) && DateTimeHelper.getClosestDate(dates, new Date()) === -1))
        {
            return null;
        }

        return this.adjustedFee[DateTimeHelper.getClosestDate(dates, new Date())];
    }
}

export class FeeCollection
{
    fees: Array<Fee>;

    constructor(items: Fee[]) 
    {
        this.fees = items;
    }

    onlyCasual(includeArchived: boolean = false): Fee[] 
    {
        return includeArchived ? this.fees.filter(i => i.isCasual()) : this.fees.filter(i => !i.isArchived() && i.isCasual());
    }

    onlyRoutine(includeArchived: boolean = false): Fee[] 
    {
        return includeArchived ? this.fees.filter(i => !i.isCasual()) : this.fees.filter(i => !i.isArchived() && !i.isCasual());
    }
}