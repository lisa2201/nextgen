import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class UtilisationreportModel {

    roomName : string;
    fullSessions : string;
    Monday : string;
    Tuesday : string;
    Wednesday : string;
    Thursday : string;
    Friday : string;
    totalFullSessions : string;
    totalPositions : string;
    weeklyOccupancy : string;


    /**
     * Constructor
     *
     * @param {*} [booking]
     * @param {number} [index]
     */
    constructor(booking?: any, index?: number)
    {
        this.roomName = booking.roomName|| '';
        this.fullSessions = booking.fullSessions|| '';
        this.Monday = booking.Monday|| '';
        this.Tuesday = booking.Tuesday|| '';
        this.Wednesday = booking.Wednesday;
        this.Thursday = booking.Thursday;
        this.Friday = booking.Friday;
        this.totalFullSessions = booking.totalFullSessions;
        this.totalPositions = booking.totalPositions;
        this.weeklyOccupancy = booking.weeklyOccupancy;

    }

    getValue(refe:any): any {

        let returnData: any = '';

        if(refe === 'roomName'){

            returnData = this.roomName;
        }
        else if(refe === 'fullSessions'){
            returnData = this.fullSessions;
        }
        else if(refe === 'Monday'){
            returnData = this.Monday || '0';
        }

        else if(refe === 'Tuesday'){
            returnData = this.Tuesday || '0';
        }
        else if(refe === 'Wednesday'){
            returnData = this.Wednesday || '0';
        }
        else if(refe === 'Thursday'){
            returnData = this.Thursday || '0';
        }
        else if(refe === 'Friday'){
            returnData = this.Friday || '0';
        }
        else if(refe === 'totalFullSessions'){
            returnData = this.totalFullSessions;
        }
        else if(refe === 'totalPositions'){
            returnData = this.totalPositions;
        }
        else if(refe === 'weeklyOccupancy'){
            returnData = this.weeklyOccupancy;
        }

        else {
            returnData = 'N/A';
        }

        return returnData;
    }




}