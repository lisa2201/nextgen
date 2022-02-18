import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class AttendanceReport {

    id: string;
    date: string;
    day: string;
    price: any;
    sessionStart: any;
    sessionEnd: any;
    isCasual: boolean;
    status: string;
    statusCode: string;
    isTemp: boolean;
    absenceNote: string;
    absenceNoteCode: string;
    room?: Room;
    fee?: string;
    child?: Child;
    checkInUser?:string;
    checkOutUser?:string;
    checkInTime?:string;
    checkOutTime?:string;
    centreCapacity?: string;
    roomCapacity?: string;
    totalRoom?: Room[];
    attendance?: any;
    checkInNote?: string;
    checkOutNote?: string;

    isNew?: boolean;
    isLoading?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
    statusLoading?: boolean;
    hasSessionRoutine?: boolean;
    sessionUpdated?: boolean;
    index?: number;
    totalBookingData:any[];
    type?: string;

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
        this.day = booking.day || '';
        this.price = parseFloat(booking.price) || 0;
        this.sessionStart = booking.start ? this.TimeTransform(parseFloat(booking.start),'12') : null;
        this.sessionEnd = booking.end? this.TimeTransform(parseFloat(booking.end),'12'): null;
        this.isCasual = booking.casual || false;
        this.status = booking.status.text || 'error';
        this.statusCode = booking.status.code || '';
        this.isTemp = booking.is_temp || false;
        this.absenceNote = booking.ab_note.text || '';
        this.absenceNoteCode = booking.ab_note.value || '';
        this.room = new Room(booking.room) || null;
        this.fee = booking.fee || null;
        this.attendance = booking.attendance || [];
        this.child = booking.child ? new Child(booking.child) : null;
        this.checkInUser = booking.attendance? ((booking.attendance.check_in_parent != null) ? (booking.attendance.check_in_parent['first_name'] + ' ' + booking.attendance.check_in_parent['last_name'] ) : ((booking.attendance.check_in_user !== null) ? booking.attendance.check_in_user['first_name'] + ' ' + booking.attendance.check_in_user['last_name'] : 'N/A')): 'N/A';
        this.checkOutUser = booking.attendance? ((booking.attendance.check_in_parent != null) ? (booking.attendance.check_out_parent['first_name'] + ' ' + booking.attendance.check_out_parent['last_name'] ) : ((booking.attendance.check_out_user !== null) ? booking.attendance.check_out_user['first_name'] + ' ' + booking.attendance.check_out_user['last_name'] : 'N/A')): 'N/A';
        this.totalRoom = allrooms ? allrooms.map((i: any, idx: number) => new Room(i, idx)) : [];
        this.checkInTime = booking.attendance? ((booking.attendance['parent_check_in_time'] != null) ? this.TimeTransform(booking.attendance['parent_check_in_time'], '12') : this.TimeTransform(booking.attendance['check_in_time'], '12')): null;
        this.checkOutTime = booking.attendance? ((booking.attendance['parent_check_out_time'] != null) ? this.TimeTransform(booking.attendance['parent_check_out_time'], '12') : this.TimeTransform(booking.attendance['check_out_time'], '12')): null;
        this.centreCapacity = booking.centre_capacity ?booking.centre_capacity: null;
        this.roomCapacity = booking.room_capacity ?booking.room_capacity: null;
        this.totalBookingData = booking.totalBookingData ?booking.totalBookingData: [];
        this.checkInNote = booking.attendance?(booking.attendance.check_in_note) : 'N/A';
        this.checkOutNote = booking.attendance?(booking.attendance.check_out_note) : 'N/A';
        this.type = booking.attendance? booking.attendance['type']: null;
        this.isNew = false;
        this.isLoading = false;
        this.isSelected = false;
        this.isDisabled = false;
        this.statusLoading = false;
        this.hasSessionRoutine = false;
        this.sessionUpdated = false;
        this.index = index || 0;
    }


    TimeTransform(value: number, type: string): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return 'N/A';
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';

        return `${h}:${m} ${a}`;
    }

    isRealValue(obj):boolean {
        return obj['check_in_user'] !== 'null' && obj['check_in_user'] !== 'undefined';
    }

    getchildAtt(child:Child):string {
        return child.getFullName();
    }

    getValue(refe:any): any {

        let returnData: any = '';
        if(refe === 'date') {
            returnData = this.date;
            // returnData = this.transaction[0].transaction_type;
        }
        else if(refe === 'day'){
            returnData = this.day.charAt(0).toUpperCase()+this.day.slice(1);
        }
        else if(refe === 'centreCapacity'){

            returnData = this.getCentreCapacity();
        }
        else if(refe === 'centreTotalBooking'){
            returnData = this.getCentreBooking();
        }
        else if(refe === 'centreUP'){
            returnData = this.getCentreUP();
        }
        else if(refe === 'roomBooking'){
            returnData = this.getRoomName();
        }
        else if(refe === 'roomCapacity'){
            returnData = this.room.getRoomCapacity(this.date);
            // returnData = this.getRoomCapacity(this.room);
        }
        else if(refe === 'roomBookings'){

            returnData = this.getRoomBookingCount();
        }
        else if(refe === 'roomUP'){
            returnData = this.getRoomUP();
        }
        else if(refe === 'child'){
            returnData = this.child.getFullName();
        }
        else if(refe === 'room'){
            returnData = this.room.title;
        }
        else if(refe === 'checkInTime'){
            returnData = this.checkInTime === 'N/A' && this.type == '1'? 'Absent' : this.checkInTime;
        }
        else if(refe === 'checkInUser'){
            returnData = this.checkInUser  === 'N/A' && this.type == '1'? '-' : this.checkInUser;
        }
        else if(refe === 'checkOutUser'){
            returnData = this.checkOutUser === 'N/A' && this.type == '1'? '-' : this.checkOutUser;
        }
        else if(refe === 'checkOutTime'){
            returnData = this.checkOutTime === 'N/A' && this.type == '1'? '-' : this.checkOutTime;
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
        }
        else if(refe === 'checkInNote'){
            returnData = this.type == '1'? '-' : this.checkInNote;
        }
        else if(refe === 'checkOutNote'){
            returnData =   this.type == '1'? '-' : this.checkOutNote;
        }
        
        else {
            returnData = 'N/A';
        }

        return returnData;
    }


    getCentreCapacity():any {

        const countArray = [];
        for(const room of this.totalRoom) {
            countArray.push(room.getRoomCapacity(this.date));
        }
        return countArray.reduce((a,b)=>a+b,0)
    }

    getCentreBooking():any {

         return this.totalBookingData.length
        // return _.first((_.map(_.filter(this.room.capacity, (val) => val.effectiveDate <= this.date && _.sortBy(val.effectiveDate)), 'capacity'))) || 0;
    }

    getCentreUP():any {

        return ((this.getCentreBooking()/this.getCentreCapacity())*100).toFixed(2)+ ' %';
        // return _.first((_.map(_.filter(this.room.capacity, (val) => val.effectiveDate <= this.date && _.sortBy(val.effectiveDate)), 'capacity'))) || 0;
    }

    getRoomName():any {

        return this.room.title
        // return _.first((_.map(_.filter(this.room.capacity, (val) => val.effectiveDate <= this.date && _.sortBy(val.effectiveDate)), 'capacity'))) || 0;
    }

    getRoomUP():any {
        return ((this.getRoomBookingCount()/this.room.getRoomCapacity(this.date))*100).toFixed(2)+ ' %';
    }

    getRoomCapacity(room: Room):any {
        return _.sum(_.map(_.filter(room.capacity, (val) => val.effectiveDate >= this.date), 'capacity')) || 0;
    }

    getRoomBookingCount(): any {
        return this.totalBookingData.filter(s => s.room_id === this.room.id).length;
    }

}