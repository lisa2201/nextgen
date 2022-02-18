import * as _ from 'lodash';

import { Branch } from '../../branch/branch.model';
import { User } from '../../user/user.model';

export class Organization 
{
    id: string;
    companyName: string;
    email: string;
    city: boolean;
    status: string;
    country: string;
    paymentFrequency: string;
    subscription: string;
    organizationCode: string;
    // firstName: string;
    // lastName: string;

    cdate: string;
    phoneNumber: string;
    address1: string;
    address2: string;
    state: string;
    zipcode: string;
    taxPercentage?: number;

    noOfBranches: number;
    branch: Branch[];
    user: User;

    preferences: JSON;
    standard: boolean;
   
    index?: number;
    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
  
   /**
    * 
    * @param {any} organization 
    */
    constructor(organization?: any, index?: number)
    {
        this.id = organization.id;
        this.companyName = organization.name;
        this.email = organization.email;
        this.city = organization.city;
        this.status = organization.status;
        this.country = organization.country || null;
        this.paymentFrequency = organization.paymentFrequency;
        this.subscription = organization.subscription;
        this.cdate = organization.cdate;

        this.phoneNumber = organization.phone;
        this.address1 = organization.address1;
        this.address2 = organization.address2;
        this.state = organization.state;
        this.zipcode = organization.zipcode;
        this.taxPercentage = organization.tax_percentage ? organization.tax_percentage : 0;

        this.noOfBranches = organization.no_of_branches;
        this.branch = (organization.branch && !_.isNull(organization.branch)) ? organization.branch.map((i: any, idx: number) => new Branch(i, idx)) : [];
        this.user = (organization.user && !_.isNull(organization.service)) ?  new User(organization.user) : null;

        this.standard = organization.standard;
        this.organizationCode = organization.organization_code;
        
        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.index = index || 0;
    }

}
