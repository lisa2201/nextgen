import * as _ from 'lodash';
import { User } from '../../user/user.model';
import { Booking } from '../booking/booking.model';
import { Child } from '../child.model';
import { Bus } from '../../service-settings/bus-list/bus-list.model';

export class Attendance {

    id?: string;
    attrId?: string;
    date?: string;

    checkInTime?: number;
    checkInUser?: User;
    checkInNote?: string;
    checkInSignature?: string;
    checkInCoordinates?: string;

    checkOutTime?: number;
    checkOutUser?: User;
    checkOutNote?: string;
    checkOutSignature?: string;
    checkOutCoordinates?: string;

    isExtra?: boolean;
    booking?: Booking;
    child?: Child;
    sessionSubmitted?: boolean;
    type?: string;

    parentCheckInTime?: number;
    checkInParent?: User;
    parentCheckOutTime?: number;
    checkOutParent?: User;

    bus?: Bus;
    // school?: any;

    isLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [attendance]
     * @param {number} [index]
     */
    constructor(attendance?: any, index?: number) 
    {
        this.id = attendance.id || '';
        this.attrId = attendance.attr_id || '';
        this.date = attendance.date || '';
        
        this.checkInTime = attendance.check_in_time || null;
        this.checkInUser = (attendance.check_in_user && !_.isNull(attendance.check_in_user)) ? new User(attendance.check_in_user) : null;
        this.checkInNote = attendance.check_in_note || '';
        this.checkInSignature = attendance.check_in_sign || null;
        this.checkInCoordinates = attendance.check_in_geo || '';

        this.checkOutTime = attendance.check_out_time || null;
        this.checkOutUser = (attendance.check_out_user && !_.isNull(attendance.check_out_user)) ? new User(attendance.check_out_user) : null;
        this.checkOutNote = attendance.check_out_note || '';
        this.checkOutSignature = attendance.check_out_sign || null;
        this.checkOutCoordinates = attendance.check_out_geo || '';

        this.isExtra = attendance.is_extra || false;
        this.booking = (attendance.booking && !_.isNull(attendance.booking)) ? new Booking(attendance.booking) : null;
        this.child = (attendance.child && !_.isNull(attendance.child)) ? new Child(attendance.child) : null;
        this.sessionSubmitted = attendance.is_submitted || false;
        this.type = attendance.type || '';
        
        this.parentCheckInTime = attendance.parent_check_in_time || null;
        this.checkInParent = (attendance.check_in_parent && !_.isNull(attendance.check_in_parent)) ? new User(attendance.check_in_parent) : null;
        this.parentCheckOutTime = attendance.parent_check_out_time || null;
        this.checkOutParent = (attendance.check_out_parent && !_.isNull(attendance.check_out_parent)) ? new User(attendance.check_out_parent) : null;

        this.bus = (attendance.bus && !_.isNull(attendance.bus)) ? new Bus(attendance.bus) : null;
      
        this.isLoading = false;
        this.index = index || 0;
    }

    /**
     * check if attendance has start and end time
     *
     * @returns {boolean}
     */
    isCompleted(): boolean
    {
        return !_.isNull(this.checkInTime) && !_.isNull(this.checkOutTime);
    }

    /**
     * check if its absence
     *
     * @returns {boolean}
     */
    isAbsence(): boolean
    {
        return this.type === '1';
    }

    /**
     * check if attendance has bus info
     *
     * @returns {boolean}
     */
    hasBusInfo(): boolean
    {
        return !_.isNull(this.bus);
    }
}
