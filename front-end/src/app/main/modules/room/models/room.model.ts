import * as _ from 'lodash';

import { User } from '../../user/user.model';
import { AppConst } from 'app/shared/AppConst';
import { Child } from '../../child/child.model';
import { RoomCapacity } from './room-capacity';
import {DateTimeHelper} from '../../../../utils/date-time.helper';

export class Room
{
    id?: string;
    title?: string;
    desc?: string;
    status: boolean;
    adminOnly: boolean;
    image?: string;
    isDeleteable?: boolean;

    staff?: User[];
    child?: Child[];
    capacity?: RoomCapacity[];
    newCapacity?: RoomCapacity[];

    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
    index?: number;

    startTime: string;
    endTime: string;
    staffRatio: number;
    /**
     * Constructor
     * 
     * @param {*} [room]
     * @param {number} [index]
     */
    constructor(room?: any, index?: number)
    {
        this.id = room.id || '';
        this.title = room.title || '';
        this.desc = room.description || '';
        this.status = room.status || '';
        this.adminOnly = room.admin_only || false;
        this.image = room.image || AppConst.image.PROFILE_ROOM_CALLBACK;
        this.isDeleteable = room.child ? room.child.length > 0 ? false : true : true;
        this.staff = (room.staff && !_.isNull(room.staff)) ? room.staff.map((i: any, idx: number) => new User(i, idx)) : [];
        this.child = (room.child && !_.isNull(room.child)) ? room.child.map((i: any, idx: number) => new Child(i, idx)) : [];
        this.capacity = (room.capacity && !_.isNull(room.capacity)) ? room.capacity.map((i: any, idx: number) => new RoomCapacity(i, idx)) : [];
        this.startTime = (room.start_time && !_.isNull(room.start_time)) ? room.start_time : null;
        this.endTime = (room.end_time && !_.isNull(room.end_time)) ? room.end_time : null;
        this.staffRatio = (room.staff_ratio && !_.isNull(room.staff_ratio)) ? room.staff_ratio : null;

        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.index = index || 0;
    }

    /**
     * update room status
     *
     * @param {boolean} value
     */
    setStatus(value: boolean): void
    {
        this.status = value;
    }

    /**
     * get room capacity based on date
     * 
     * @param date 
     */
    getRoomCapacity(date: string): any
    {
        if(_.isEmpty(this.capacity))
        {
            return 0;
        }

        this.capacity.sort((a, b) => {

            if(a.effectiveDate > b.effectiveDate)
                return -1;
            if(a.effectiveDate < b.effectiveDate)
                return 1;
            if(a.effectiveDate === b.effectiveDate)
                return a.createdAt > b.createdAt? -1 : 1;

            // return a.effectiveDate > b.effectiveDate? -1 : 1;
        });

        this.newCapacity = this.capacity.filter(x => DateTimeHelper.isSameOrBefore(DateTimeHelper.parseMoment(x.effectiveDate), DateTimeHelper.parseMoment(new Date().toISOString().slice(0, 10))));


        if(_.first(this.newCapacity))
            return _.first(this.newCapacity).capacity;
        else
            return 0;

        // return _.first(this.capacity).getCapacity(new Date().toISOString().slice(0, 10));
    }
    
}