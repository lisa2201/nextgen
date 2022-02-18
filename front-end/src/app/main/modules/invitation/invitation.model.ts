import * as _ from 'lodash';

export class Invitation 
{
    id: string;
    email: string;
    expired: boolean;

    organization?: string;
    branch?: string;
    branchId?: string;
    created?: string;
    expires?: string;
    assignRoles?: any;
    isOwner?: boolean;
    parent?: boolean;

    index?: number;
    expand?: boolean;

    /**
     * Constructor
     * 
     * @param {*} [invitation]
     * @param {number} [index]
     */
    constructor(invitation?: any, index?: number)
    {
        this.id = invitation.id;
        this.email = invitation.email;
        this.expired = invitation.expired;

        this.organization = invitation.organization || null;
        this.branch = invitation.branch || null;
        this.branchId = invitation.branch_id || null;
        this.created = invitation.account_created || null;
        this.expires = invitation.expired_on || null;
        this.assignRoles = invitation.role_data || {};
        this.isOwner = invitation.has_owner_access || false;
        this.parent = invitation.is_parent || false;
        
        this.index = index || 0;
        this.expand = false;
    }

    /**
     * formate branch label
     *
     * @returns {string}
     * @memberof Invitation
     */
    getBranchLabel(): string
    {
        return (!_.isNull(this.branch) && this.branch !== '') ? _.toLower(this.branch) : 'site-manager';
    }

    /**
     * formate expiry label
     *
     * @returns {string}
     */
    getExpiredLabel(): string
    {
        return '<img src="assets/icons/flat/ui_set/custom_icons/' + ((!this.expired) ? 'checked.svg' : 'cancel.svg') + '" class="table-svg-icon"/>';
    }
}
