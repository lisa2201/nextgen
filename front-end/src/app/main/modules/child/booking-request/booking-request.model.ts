import * as _ from 'lodash';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { Room } from '../../room/models/room.model';
import { User } from '../../user/user.model';
import { Child } from '../child.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';

export class BookingRequest 
{
    id: string;
    date: string;
    endDate: string;
    days: any;
    status: string;
    type: string;

    room: Room;
    fee: Fee;
    child: Child;
    booking?: Booking;
    creator?: User;

    lateTime?: number;
    lateDesc?: string;

    isLoading?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;

    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [request]
     * @param {number} [index]
     */
    constructor(request?: any, index?: number) 
    {
        this.id = request.id || '';
        this.date = request.date || null;
        this.endDate = request.until || null;
        this.days = request.days || [];
        this.status = request.status || null;
        this.type = request.type || null;

        this.room = (request.room && !_.isNull(request.room)) ? new Room(request.room) : null;
        this.fee = (request.fee && !_.isNull(request.fee)) ? new Fee(request.fee) : null;
        this.child = (request.child && !_.isNull(request.child)) ? new Child(request.child) : null;
        this.booking = (request.booking && !_.isNull(request.booking)) ? new Booking(request.booking) : null;
        this.creator = (request.creator && !_.isNull(request.creator)) ? new User(request.creator) : null;

        this.lateTime = request.late.time || 0;
        this.lateDesc = request.late.desc || '';

        this.isLoading = false;
        this.isSelected = false;
        this.isDisabled = false;
        this.index = index || 0;
    }

    hasEndDate(): boolean
    {
        return !_.isNull(this.endDate);
    }

    isLateType(): boolean
    {
        return _.indexOf(['4', '5'], this.type) > -1;
    }

    isPickup(): boolean
    {
        return this.type === '5'
    }

    isAbsence(): boolean
    {
        return this.type === '2'
    }

    isCasual(): boolean
    {
        return this.type === '0'
    }

    isBookingCreateType(): boolean
    {
        return _.indexOf(['0', '1'], this.type) > -1;
    }

    isBookingUpdateType(): boolean
    {
        return _.indexOf(['2', '3', '4', '5'], this.type) > -1;
    }

    getTypeLabel(): string
    {
        let label = '';

        switch (this.type) 
        {
            case '1':
                label = 'Standard Requests';
                break;

            case '2':
                label = 'Absence Requests';
                break;

            case '3':
                label = 'Holiday Requests';
                break;

            case '4':
                label = 'Late Drop Requests';
                break;

            case '5':
                label = 'Late Pickup Requests';
                break;
        
            default:
                label = 'Casual Requests';
                break;
        }

        return label;
    }
}
