import {ServiceSetup} from '../account-manager/service-setup/models/service-setup.model';
import * as _ from 'lodash';

export class Branch {
    id: string;
    name: string;
    attrId?: string;
    domain?: string;
    email?: string;
    desc?: string;
    orgName?: string;
    orgId?: string;
    phoneNumber?: string;
    faxNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    zipCode?: string;
    city?: string;
    country?: string;
    status?: boolean;
    created?: string;
    sDelete?: boolean;
    timeZone?: string;
    media?: any;
    url?: string;
    service?: ServiceSetup;
    openingHours?: any;
    hasKinderConnect?: boolean;
    link?: string;
    branchLogo?: string;
    newAdvancedPayment?: boolean;
    startDate?: string;

    index?: number;
    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
    disabled?: boolean;
    pincode: string;

    /**
     * Constructor
     *
     * @param {*} [branch]
     * @param {number} [index]
     */
    constructor(branch?: any, index?: number) 
    {
        this.id = branch.id || '';
        this.name = branch.name || '';
        this.attrId = branch.attr_id || '';
        this.domain = branch.domain || '';
        this.email = branch.email || '';
        this.desc = branch.desc || '';
        this.orgName = branch.org_name || '';
        this.orgId = branch.org || '';
        this.phoneNumber = branch.phone || '';
        this.faxNumber = branch.fax || '';
        this.addressLine1 = branch.address1 || '';
        this.addressLine2 = branch.address2 || '';
        this.zipCode = branch.zipcode || '';
        this.city = branch.city || '';
        this.country = branch.country || '';
        this.status = branch.status || false;
        this.created = branch.cdate || '';
        this.sDelete = branch.sdelete || false;
        this.timeZone = branch.tz || '';
        this.media = branch.media || {};
        this.url = branch.url || '';
        this.service = (branch.service && !_.isNull(branch.service)) ? new ServiceSetup(branch.service) : null;
        this.openingHours = branch.opening_hours || null;
        this.pincode = branch.pincode || '';
        this.hasKinderConnect = branch.has_kinder_connect || false;
        this.link = branch.link || '';
        this.branchLogo = branch.branch_logo || '';
        this.newAdvancedPayment = branch.new_advanced_payment || false;
        this.startDate = branch.start_date || '';

        //
        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.disabled = false;
        this.index = index || 0;
    }

    /**
     * update branch status
     *
     * @param {boolean} value
     * @memberof Branch
     */
    setStatus(value: boolean): void {
        this.status = value;
    }

    /**
     * update branch disable|selected status
     *
     * @param {boolean} value
     * @memberof Branch
     */
    setDisableStatus(value: boolean): void {
        this.disabled = value;
    }
}
