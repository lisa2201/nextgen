import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class DailyBuslistReportModel {

    childName: string;
    phoneNumber: string;
    homePhone: string;
    workPhone: string;
    booking: string;
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
        this.booking = booking.booking;

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
        else if(refe === 'booking'){
            returnData = this.booking;
        }

        else {
            returnData = 'N/A';
        }

        return returnData;
    }




}