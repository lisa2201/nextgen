import { ServiceSetup } from '../../service-setup/models/service-setup.model';
import * as _ from 'lodash';
import { CcsSetup } from 'app/main/modules/ccs-setup/ccs-setup.model';

export class ProviderSetup {

    id?: string;
    providerId?: string;
    buisnessName ?: string;
    legalName ?: string;
    nameType ?: string;
    color?: string;
    entityType?: string;
    abn?: string;
    registrationCode?: string;
    dateOfEvent?: string;
    mobile?: string;
    email?: string;
    addressType?: string;
    addressLine?: string;
    suburb?: string;
    state?: string;
    postalCode?: string;
    financialBSB ?: string;
    accountNumber?: string;
    accountName?: string;
    phone?: string;
    date?: string;  
    canEditable?: boolean;
    isDeleted?: boolean;
    services?: ServiceSetup[];
    isSynced?: string;
    ccsSetup?: CcsSetup;

    isNew?: boolean;
    isLoading?: boolean;
    display ?: any;
    group ?: any;
    index ?: any;
 
    /**
     * Constructor
     *
     * @param providerSetup
     */
    constructor(providerSetup?: any) 
    {
        this.id = providerSetup.id;
        this.providerId = providerSetup.provider_id || null;
        this.buisnessName = providerSetup.buisness_name || null;
        this.legalName = providerSetup.legal_name || null;

        this.nameType = providerSetup.name_type || null;
        this.entityType = providerSetup.entity_type || null;
        this.abn = providerSetup.ABN || null;
        this.registrationCode = providerSetup.registration_code || null;
        this.dateOfEvent = providerSetup.date_of_event || null;
        this.mobile = providerSetup.mobile || null;
        this.email = providerSetup.email || null;
        this.addressType = providerSetup.address || null;
        // this.addressLine = providerSetup.provider_name;
        // this.suburb = providerSetup.suburb;
        this.state = providerSetup.state || null;
        // this.postalCode = providerSetup.postal_code;
        this.financialBSB = providerSetup.financial || null;
        // this.accountNumber = providerSetup.account_number;
        // this.accountName = providerSetup.account_name;
        this.date = providerSetup.date_of_event || null;
        // this.isDeleted = providerSetup.isdel;
        // this.canEditable = providerSetup.isedit;
        // this.color = providerSetup.color || null;
        // this.display = providerSetup.display;
        // this.group = providerSetup.group;
        // this.services = providerSetup.services;
        // this.services = providerSetup.services.map((i: any) => new ServiceSetup(i)) || [];
        this.services = (providerSetup.services && !_.isNull(providerSetup.services)) ? providerSetup.services.map((i: any) => new ServiceSetup(i)) : null;
        this.isSynced = providerSetup.is_synced;
        this.isNew = false;
        this.isLoading = false;

        this.ccsSetup = providerSetup.ccs_setup ? new CcsSetup(providerSetup.ccs_setup) : null;
    }

    /**
    * can editable
    */
    isEditable(): boolean 
    {
        return this.canEditable;
    }

    /**
     * get status
     */
    getApprovalStatus(status: string): string 
    {
        if (status === 'CURR') 
        {
            return 'Current';
        }
        else if (status === 'SUSP') 
        {
            return 'Suspended';
        }
        else if (status === 'CANC') 
        {
            return 'Cancelled';
        }
        else if (status === 'REFU') 
        {
            return 'Refused';
        }
        else if (status === 'PEND') 
        {
            return 'Pending';
        }
        else 
        {
            return 'N/A';
        }
    }





}












