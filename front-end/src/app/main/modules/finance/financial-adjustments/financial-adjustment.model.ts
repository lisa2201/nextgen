import { AdjustmentItem } from '../../service-settings/adjustment-items/adjustment-item.model';
import { Child } from '../../child/child.model';
import * as _ from 'lodash';

export class FinancialAdjustmentHeader {

    id: string;
    // date: string;
    startDate: string;
    endDate: string;
    type: string;
    amount: number;
    comment: string;
    executed: boolean;
    scheduled: boolean;
    reversed: boolean;
    properties: {days: []};

    item?: AdjustmentItem;
    details?: FinancialAdjustmentDetail[];
    createdAt?: string;

    index: number;

    constructor(header?: any, index?: number) {

        this.id = header.id;
        // this.date = header.date;
        this.startDate = header.start_date;
        this.endDate = header.end_date;
        this.type = header.type;
        this.amount = header.amount;
        this.comment = header.comment;
        this.scheduled = header.scheduled;
        this.executed = header.executed;
        this.createdAt = header.created_at;
        this.reversed = header.reversed;
        this.properties = header.properties;
    
        this.item = header.item ? new AdjustmentItem(header.item) : null;
        this.details = (header.details && _.isArray(header.details)) ? header.details.map((val: any, idx: number) => new FinancialAdjustmentDetail(val, idx)) : [];

        this.index = index || 0;

    }

}

export class FinancialAdjustmentDetail {

    id: string;
    date: string;

    child: Child;
    item?: AdjustmentItem;

    index: number;

    constructor(detail?: any, index?: number) {

        this.id = detail.id;
        this.date = detail.date;
        this.child =  detail.child ? new Child(detail.child) : null;
        this.item = detail.item ? new AdjustmentItem(detail.item) : null;

        this.index = index || 0;
        
    }

}
