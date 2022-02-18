import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class BuslistReportModel {

    childName: string;
    phoneNumber: string;
    homePhone: string;
    workPhone: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
    feeName: string;

    /**
     * Constructor
     * 
     * @param {*} [booking]
     * @param {number} [index]
     */
    constructor(booking?: any, index?: number)
    {
        this.childName = booking.childName || '';
        this.phoneNumber = booking.mobile|| '';
        this.homePhone = booking.homePhone|| '';
        this.workPhone = booking.workPhone|| '';
        this.monday = booking.monday;
        this.tuesday = booking.tuesday;
        this.wednesday = booking.wednesday;
        this.thursday = booking.thursday;
        this.friday = booking.friday;
        this.saturday = booking.saturday;
        this.sunday = booking.sunday;

    }

    getValue(refe:any): any {

        let returnData: any = '';

        if(refe === 'childName'){

            returnData = this.childName;
        }
        else if(refe === 'homePhone'){
            returnData = this.homePhone;
        }
        else if(refe === 'workPhone'){
            returnData = this.workPhone;
        }

        else if(refe === 'phoneNumber'){
            returnData = this.phoneNumber;
        }
        else if(refe === 'monday'){
            returnData = this.monday;
        }
        else if(refe === 'monday'){

            returnData = this.monday;
        }
        else if(refe === 'tuesday'){
            returnData = this.tuesday;
        }
        else if(refe === 'wednesday'){
            returnData = this.wednesday;
        }
        else if(refe === 'thursday'){
            returnData = this.thursday;
        }
        else if(refe === 'friday'){
            returnData = this.friday;
        }
        else if(refe === 'saturday'){
            returnData = this.saturday;
        }
        else if(refe === 'sunday'){
            returnData = this.sunday;
        }

        else {
            returnData = 'N/A';
        }

        return returnData;
    }




}