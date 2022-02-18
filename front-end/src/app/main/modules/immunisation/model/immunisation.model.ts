import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { Branch } from '../../branch/branch.model';
import { User } from '../../user/user.model';
import { ImmunisationSchedule } from './immunisation-schedule.model';

export class Immunisation {

    id: string;
    name: string;
    desc?: string;
    creator?: any;
    status?: boolean;
    isNew?: boolean;
    isLoading?: boolean;
    index?: number;
    expand?: boolean;
    statusLoading?: boolean;
    branch?: any;

    schedule?: ImmunisationSchedule[];
    /**
     * Constructor
     * 
     * @param {*} [immunisation]
     * @param {number} [index]
     */
    constructor(immunisation?: any, index?: number) 
    {
        this.id = immunisation.id || '';
        this.name = immunisation.name || '';
        this.desc = immunisation.desc || '';
        this.creator =  new User(immunisation.creator) || '';
        this.schedule = immunisation.schedule ? immunisation.schedule.map((i: any, idx: number) => new ImmunisationSchedule(i,idx)) : [];
        this.status = immunisation.status === '1' ? true : false || false;
        this.branch = immunisation.branch? new Branch(immunisation.branch) : null;
        this.expand = false;
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
        this.statusLoading = false;
    }

    setStatus(value: boolean): void {
        this.status = value;
    }

    getShortName(): string {

        return this.name.length > 10 ? `${this.name.slice(0,10)}...` : this.name;
    }

}
