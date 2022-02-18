import * as _ from 'lodash';

import { User } from '../../user/user.model';
import { Room } from './room.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

export class RoomCapacity
{
    id?: string;
    capacity?: string;
    effectiveDate?: string;
    created?: string;
    createdAt?: string;
    status: boolean;
    author?: User;
    room?: Room;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [roomCapacity]
     * @param {number} [index]
     */
    constructor(roomCapacity?: any, index?: number)
    {
        this.id = roomCapacity.id || '';
        this.capacity = roomCapacity.capacity || 0;
        this.status = roomCapacity.status || '';
        this.effectiveDate = roomCapacity.effective_date || '';
        this.created = roomCapacity.created || '';
        this.createdAt = roomCapacity.created_at || '';
        this.author = roomCapacity.author ? new User(roomCapacity.author) : null;
        this.room = roomCapacity.room ? new Room(roomCapacity.room) : null;
        this.index = index || 0;
    }

    /**
     * update room status
     *
     * @param {boolean} value
     * @memberof Room
     */
    setStatus(value: boolean): void
    {
        this.status = value;
    }

    /**
     * get capacity based on date
     * 
     * @param date 
     */
    getCapacity(date: string): any
    {
        return (this.capacity && DateTimeHelper.isSameOrBefore(DateTimeHelper.parseMoment(this.effectiveDate), DateTimeHelper.parseMoment(date))) ? this.capacity : 0;
    }
    
}
