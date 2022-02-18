import { Branch } from 'app/main/modules/branch/branch.model';
import { ImmunisationSchedule } from 'app/main/modules/immunisation/model/immunisation-schedule.model';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { Child } from '../../child.model';

export class ImmunisationTracker {

    id: string;
    creator?: User;
    child?: Child;
    isNew?: boolean;
    date?: string;
    isLoading?: boolean;
    index?: number;
    branch?: Branch;
    immunisation?: Immunisation;
    schedule?: ImmunisationSchedule;

    createdAt?: string; 
    updatedAt?: string;
    /**
     * Constructor
     * 
     * @param {*} [immunisation]
     * @param {number} [index]
     */
    constructor(immunisationTracker?: any, index?: number) 
    {
        this.id = immunisationTracker.id || '';
        this.date = immunisationTracker.date;
        this.creator = (immunisationTracker.creator && !_.isNull(immunisationTracker.creator)) ? new User(immunisationTracker.creator) : null;
        this.schedule = (immunisationTracker.schedule && !_.isNull(immunisationTracker.schedule))? new  ImmunisationSchedule(immunisationTracker.schedule) : null;
        this.branch = immunisationTracker.branch? new Branch(immunisationTracker.branch) : null;
        this.immunisation = immunisationTracker.immunisation || null;

        // this.immunisation = (immunisationTracker.immunisation && !_.isNull(immunisationTracker.immunisation)) ?  new Immunisation(immunisationTracker.immunisation) : null;
        this.child =  (immunisationTracker.child && !_.isNull(immunisationTracker.child)) ? new Child(immunisationTracker.child) : null;
        this.createdAt = immunisationTracker.created_on || null;
        this.updatedAt = immunisationTracker.updated_on || null;
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
        
    }


}
