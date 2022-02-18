import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class BusAttendanceReportModel {

    id: string;
    date: string;
    child: string;
    childName: string;
    bus: any;
    school: any;
    pickUser: any;
    pickUserName: any;
    pickTime: any;
    dropUser: any;
    dropUserName: any;
    dropTime: any;
    type: string;
    absenceNote: string;
    absenceNoteCode: string;
    attendance?: any;


    /**
     * Constructor
     *
     * @param {*} [booking]
     * @param {number} [index]
     */
    constructor(booking?: any, index?: number, allrooms?:any)
    {
        this.id = booking.id || '';
        this.date = booking.date || '';
        this.child = booking.child;
        this.childName = booking.child.f_name + ' ' + booking.child.l_name;
        this.bus = booking.bus;
        this.school = booking.school;
        this.pickUser = booking.check_out_user;
        this.pickUserName = (booking.check_out_user) ? booking.check_out_user.firstname || '' + ' ' + booking.check_out_user.last_name || '' : null;
        this.pickTime = booking.pick_time;
        this.dropUser = booking.check_in_user;
        this.dropUserName = (booking.check_in_user) ? booking.check_in_user.first_name || '' + ' ' + booking.check_in_user.last_name  || '' : null;
        this.dropTime = booking.drop_time;
        this.type = (booking.type === 0)? 'Absence' : 'Attendance';
        /* this.absenceNote = booking.absenceNote;*/
        /* this.absenceNoteCode = booking.absenceNoteCode;*/
        /* this.attendance = booking.attendance;*/
    }

    getValue(refe:any): any {

        let returnData: any = '';
        if(refe === 'date') {
            returnData = this.date;
            // returnData = this.transaction[0].transaction_type;
        }
        else if(refe === 'childName'){

            returnData = this.childName;
        }
        else if(refe === 'bus'){
            returnData = this.bus.bus_name;
        }
        else if(refe === 'school'){
            returnData = this.school.school_name;
        }
        else if(refe === 'dropUserName'){

            returnData = this.dropUserName;
        }
        else if(refe === 'dropTime'){
            returnData = this.dropTime;
        }
        else if(refe === 'pickUserName'){
            returnData = this.pickUserName;
        }
        else if(refe === 'pickTime'){
            returnData = this.pickTime;
            // returnData = this.getRoomCapacity(this.room);
        }
        else if(refe === 'type'){
            returnData = this.type;
        }
        /*else if(refe === 'room'){
            returnData = this.room.title;
        }
        else if(refe === 'checkInTime'){
            returnData = this.checkInTime;
        }
        else if(refe === 'checkInUser'){
            returnData = this.checkInUser;
        }
        else if(refe === 'checkOutUser'){
            returnData = this.checkOutUser;
        }
        else if(refe === 'checkOutTime'){
            returnData = this.checkOutTime;
        }
        else if(refe === 'price'){
            returnData = this.price;
        }
        else if(refe === 'sessionStart'){
            returnData = this.sessionStart;
        }
        else if(refe === 'sessionEnd'){
            returnData = this.sessionEnd;
        }
        else if(refe === 'status'){
            returnData = this.status;
        }
        else if(refe === 'sessionHours'){
            returnData =  this.sessionStart+  ' to ' + this.sessionEnd;
        }*/

        else {
            returnData = 'N/A';
        }

        return returnData;
    }




}