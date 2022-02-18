import * as _ from 'lodash';
import { Room } from '../../room/models/room.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { Child } from '../child.model';
import { Attendance } from '../attendance/attendance.model';
import { User } from '../../user/user.model';
import { Bus } from '../../service-settings/bus-list/bus-list.model';
import { AdjustedFee } from '../../centre-settings/fees/model/fee-adjusted.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class Booking {

    id: string;
    attrId: string;
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
    isAbsentDocumentHeld: boolean;
    room: Room;
    fee: Fee;
    child?: Child;
    creator?: User;
    attendance?: Attendance;
    adjustedFee?: AdjustedFee; 
    hasRoomSync?: boolean;
    
    deletedAt?: string; 
    createdAt?: string; 
    updatedAt?: string;

    isNew?: boolean;
    isLoading?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
    statusLoading?: boolean;
    hasSessionRoutine?: boolean;
    sessionUpdated?: boolean; // already submitted items
    hasSessionUpdate?: boolean;
    hasSessionError?: boolean;
    holdAttendanceTime?: Array<number>;
    holdAttendanceStartTime?: number;
    holdAttendanceEndTime?: number;
    
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [booking]
     * @param {number} [index]
     */
    constructor(booking?: any, index?: number) 
    {
        this.id = booking.id || '';
        this.attrId = booking.attr_id || '';
        this.date = booking.date || '';
        this.day = booking.day || '';
        this.price = parseFloat(booking.price) || 0;
        this.sessionStart = parseFloat(booking.start) || 0;
        this.sessionEnd = parseFloat(booking.end) || 0;
        this.isCasual = booking.casual || false;
        this.status = booking.status.text || 'error';
        this.statusCode = booking.status.code || '';
        this.isTemp = booking.is_temp || false;
        this.absenceNote = booking.ab_note.text || '';
        this.absenceNoteCode = booking.ab_note.value || '';
        this.isAbsentDocumentHeld = booking.ab_note.is_document_held || false;
        this.room = (booking.room && !_.isNull(booking.room)) ? new Room(booking.room) : null;
        this.fee = (booking.fee && !_.isNull(booking.fee)) ? new Fee(booking.fee) : null;
        this.child = (booking.child && !_.isNull(booking.child)) ? new Child(booking.child) : null;
        this.attendance = (booking.attendance && !_.isNull(booking.attendance)) ? new Attendance(booking.attendance) : null;
        this.creator = (booking.creator && !_.isNull(booking.creator)) ? new User(booking.creator) : null;
        this.adjustedFee = booking.adjusted_fee ? new AdjustedFee(booking.adjusted_fee) : null;
        this.hasRoomSync = booking.has_room_sync || false;
        this.createdAt = booking.created_on || null;
        this.updatedAt = booking.updated_on || null;
        this.deletedAt = booking.deleted_on || null;

        this.isNew = false;
        this.isLoading = false;
        this.isSelected = false;
        this.isDisabled = false;
        this.statusLoading = false;
        this.hasSessionRoutine = false;
        this.sessionUpdated = false;
        this.hasSessionUpdate = false;
        this.hasSessionError = false;
        this.holdAttendanceTime = null;
        this.holdAttendanceStartTime = null;
        this.holdAttendanceEndTime = null;
        this.index = index || 0;
    }

    /**
     * get session duration
     *
     * @returns {number}
     */
    getHourlySessionHours(): number
    {
        return (this.sessionEnd - this.sessionStart) / 60;
    }

    /**
     * has attendance
     *
     * @returns {boolean}
     */
    hasAttendance(): boolean
    {
        return !_.isNull(this.attendance);
    }

    /**
     * has complete attendance
     *
     * @returns {boolean}
     */
    hasCompleteAttendance(): boolean
    {
        return this.hasAttendance() && this.attendance.isCompleted();
    }

    /**
     * check if child absent
     *
     * @returns {boolean}
     */
    isAbsent(): boolean
    {
        return this.statusCode === '2';
    }

    /**
     * check if child holiday
     *
     * @returns {boolean}
     */
    isHoliday(): boolean
    {
        return this.statusCode === '3';
    }

    /**
     * set session status
     *
     * @param {boolean} value
     */
    setSessionRoutineStatus(value: boolean): void
    {
        this.hasSessionRoutine = value;
    }

    /**
     * set session is submitted
     *
     * @param {boolean} value
     */
    setSessionUpdatedStatus(value: boolean): void
    {
        this.sessionUpdated = value;
    }

    /**
     * set session has new update
     *
     * @param {boolean} value
     */
    setHasSessionUpdateStatus(value: boolean): void
    {
        this.hasSessionUpdate = value;
    }

    /**
     * check if booking has some errors
     *
     * @param {Room[]} [rooms=[]]
     * @param {Fee[]} [fees=[]]
     * @returns {{ hasError: boolean, messages: Array<string>[] }}
     */
    hasError(rooms: Room[] = [], fees: Fee[] = []): { hasError: boolean, messages: Array<string>[] }
    {
        let hasError = false;

        const message = [];

        if (rooms.filter(r => r.id === this.room.id).length < 1)
        {
            hasError = true;

            message.push('Room missing! Please select another option');
        }
        
        if (fees.filter(r => r.id === this.fee.id).length < 1)
        {
            hasError = true;

            message.push('Fee missing! Please select another option');
        }

        return {
            hasError: hasError,
            messages: message
        }
    }

    /**
     * check if removed room link available and ignore booking status
     *
     * @returns {boolean}
     */
    hasRemovedRoomLinked(): boolean
    {
        return this.statusCode !== '0' && !_.isNull(this.room);
    }

    /**
     * get attendance bus information
     *
     * @returns {Bus}
     */
    getAttendanceBusInfo(): Bus
    {
        return this.attendance && this.attendance.hasBusInfo() ? this.attendance.bus : null;
    }

    /**
     * check if adjusted is a future date
     *
     * @returns {boolean}
     */
    isAdjustedFeeIsFuture(): boolean
    {
        return !_.isNull(this.adjustedFee) ? DateTimeHelper.parseMoment(this.adjustedFee.effectiveDate).isAfter(DateTimeHelper.now()) : false;
    }

    /**
     * get booking fee amount
     *
     * @returns {number}
     */
    getBookingFeeAmount(): number
    {
        return !_.isNull(this.adjustedFee) ? +this.adjustedFee.netAmount : +this.price;
    }
}
