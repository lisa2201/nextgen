import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';
import * as _ from 'lodash';

export class ServiceSetup {

    id: string;
    serviceid: string;
    servicetype: string;
    noOfweeks: string;
    color: string;
    servicename: string;
    serviceapprovelstatus: string;
    mobile: string;
    email: string;
    addressType: string;
    addressLine: string;
    suburb: string;
    state: string;
    postalCode: string;
    financialBSB: string;
    accountNumber: string;
    accountName: string;
    phone: string;
    date: string;  
    canEditable: boolean;
    isDeleted: boolean;

    isNew?: boolean;
    isLoading?: boolean;
     
    display: any;
    group: any;
    index: any;
    startdate: any;
    enddate: any;
    ACECQARegistrationCode: any;
    ACECQAExemptionReason: any;
    provider?: ProviderSetup;

    physicalAddress: any;
    postalAddress: any;
   
    /**
     * Constructor
     *
     * @param servicesetup
     */
    constructor(servicesetup?: any)
    {
        this.id = servicesetup.id;
        this.serviceid = servicesetup.service_id;
        this.servicetype = servicesetup.service_type;
        this.noOfweeks = servicesetup.no_of_weeks;
        this.servicename = servicesetup.service_name;
        this.startdate = servicesetup.start_date;
        this.enddate = servicesetup.end_date;
        this.ACECQARegistrationCode = servicesetup.ACECQARegistrationCode;
        this.ACECQAExemptionReason = servicesetup.ACECQAExemptionReason;

        this.provider = servicesetup.provider ? new ProviderSetup(servicesetup.provider) : null;
        this.physicalAddress = _.head(_.filter(servicesetup.address, ['type', 'ZPHYSICAL']));
        this.postalAddress = _.head(_.filter(servicesetup.address, ['type', 'ZPOSTAL']));

        // this.addressType = servicesetup.address_type;
        // this.addressLine = servicesetup.provider_name;
        // this.suburb = servicesetup.suburb;
        // this.state = servicesetup.state;
        // this.postalCode = servicesetup.postal_code;
        // this.financialBSB = servicesetup.financial_BSB;
        // this.accountNumber = servicesetup.account_number;
        // this.accountName = servicesetup.account_name;
        // this.date = servicesetup.date;
        // this.email = servicesetup.email;
        // this.phone = servicesetup.phone;
        // this.mobile = servicesetup.mobile;
        // this.isDeleted = servicesetup.isdel;
        // this.canEditable = servicesetup.isedit;
        // this.color = servicesetup.color || null;
        // this.display = servicesetup.display;
        // this.group = servicesetup.group;

        this.isNew = false;
        this.isLoading = false;
    }



    /**
    * can editable
    */
    isEditable(): boolean {
        return this.canEditable;
    }





}












