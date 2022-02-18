import { User } from 'app/main/modules/user/user.model';
import { Child } from 'app/main/modules/child/child.model';
import * as _ from 'lodash';

export class BondPayment
{
    id: string;
    date?: string;
    user?: User;
    child?: Child;
    type?: string;
    comments?: string;
    amount?: string;
    hasAdminPrivileges?: boolean;

    isNew?: boolean;
    isLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [role]
     * @param {number} [index]
     */
    constructor(bond?: any, index?: number)
    {
        this.id = bond.id;
        this.date = bond.date;
        this.user = (bond.user && !_.isNull(bond.user)) ? new User(bond.user) : null;
        this.child = (bond.child && !_.isNull(bond.child)) ? new Child(bond.child) : null;
        this.type = bond.type;
        this.comments = bond.comments;
        this.amount = bond.amount;
        this.hasAdminPrivileges = bond.is_admin || false;
        //
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
    }

    typeLabel(): string
    {
        return '<img src="assets/icons/flat/ui_set/arrows/svg/' + ((this.type === 'Receiving') ? '031-down-arrow-8.svg' : '029-up-arrow-7.svg') + '" class="table-svg-icon"/>';
    }

}
