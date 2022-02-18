import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { addMonths, addWeeks, addYears, parseISO } from 'date-fns';
import * as _ from 'lodash';
import { Child } from '../../child/child.model';

export class ImmunisationSchedule {

    id: string;
    number?: number;
    period?: string;
    isLoading?: boolean;

    /**
     * Constructor
     * 
     * @param {*} [immunisationSchedule]
     * @param {number} [index]
     */
    constructor(immunisationSchedule?: any, index?: number) 
    {
        this.id = immunisationSchedule.id || '';
        this.number = immunisationSchedule.number || '';
        this.period = immunisationSchedule.period || '';
        this.isLoading = false;
    }

    getScheduleTitle(): string {
    
       return AppConst.ImmunisationOption.find(v => (v.value === this.period)).name;
    }

    getTrackingDate(child: Child): string {

        let date;
        let dob =  DateTimeHelper.getUtcDate(child.dob)
        if(this.period === 'W') {

            date = addWeeks(parseISO(dob), this.number)
        }
        if(this.period === 'M'){

            date = addMonths(parseISO(dob), this.number)
        }

        if(this.period === 'Y'){

            date = addYears(parseISO(dob), this.number)
        }

        return DateTimeHelper.getUtcDate(date);
        
    }


}
