import * as _ from 'lodash';
import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';

export class ProviderPersonnel 
{
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    roles?: [];
    phone?: string;
    wwcc?: [];
    providerId?: string;
    isSynced?: string;
    syncerror?: string;
    identity?: string;
    // branchIndex?: string;
    userIndex?: string;

    index?: number;
    isNew?: boolean;
    isLoading?: boolean;
    indentification?: string;
    prodaId?: string;
    dob?: string;
    personnelDeclaration?: [];
    supportingDocuments?: [];
    personId?: string;
    provider?: ProviderSetup;
    


    constructor(providerPersonnel?: any, index?: number)
    {
        this.id = providerPersonnel.id;
        this.firstName = providerPersonnel.first_name;
        this.lastName = providerPersonnel.last_name;
        this.phone = providerPersonnel.phone;
        this.email = providerPersonnel.email;
        this.roles = _.isString(providerPersonnel.roles) ? JSON.parse(providerPersonnel.roles) : providerPersonnel.roles;
        this.wwcc = _.isString(providerPersonnel.wwcc) ? JSON.parse(providerPersonnel.wwcc) : providerPersonnel.wwcc;
        this.providerId = providerPersonnel.provider_id;
        // this.serviceId = providerPersonnel.service_id;
        this.syncerror = JSON.parse(providerPersonnel.syncerror);
        this.isSynced = providerPersonnel.is_synced;
        this.prodaId = providerPersonnel.proda_id;
        this.dob = providerPersonnel.dob;
        this.personnelDeclaration =  _.isString(providerPersonnel.personnel_declaration) ? JSON.parse(providerPersonnel.personnel_declaration) : providerPersonnel.personnel_declaration;
        this.supportingDocuments = _.isString(providerPersonnel.supporting_documents) ? JSON.parse(providerPersonnel.supporting_documents) : providerPersonnel.supporting_documents;
        this.identity = providerPersonnel.indentification;
        // this.branchIndex = providerPersonnel.branch;
        this.userIndex = providerPersonnel.user;
        this.personId = providerPersonnel.person_id  || '';

        this.provider = providerPersonnel.provider ? new ProviderSetup(providerPersonnel.provider) : null;

        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;

    }

    getPersonnelDeclarationTitle(title: string): any {
        try {
            if (title === 'wwcc') {
                return 'WWCC';
            }
            else if (title === 'policeCheck') {
                return 'Police Check';
            }
            else if (title === 'AFSA') {
                return 'AFSA';
            }
            else if (title === 'ASIC') {
                return 'ASIC';
            }
            else if (title === 'adverseEvents') {
                return 'Adverse Events';
            }
            else { return ''; }
        }
        catch (err)
        {
            return '';
        }
        
    }

    getPersonnelDeclarationStatusImage(status: boolean): any {
        try {
            return `assets/icons/flat/ui_set/custom_icons/${(status ? 'document_yes' : 'document_no')}.svg`;
            // return 'assets/icons/flat/ui_set/custom_icons/' + status ? 'document_yes.svg' : 'document_no.svg';
        }
        
        catch (err)
        {
            return '';
        }
    }

    getRoleType(type: string): any {
        try {

            if (type === 'MANCON') {
                return 'Provider Management or Control';
            }

            else if (type === 'CONTAC') {
                return 'Service Contact';
            }
        }
        catch (err)
        {
            return '';
        }
        
    }

    getRoleTypeHelp(type: string): any {
        try {

            if (type === 'OPERAT') {
                return 'Is a person responsible for undertaking the day-to-day operation of the service.';
            }

            else if (type === 'CONTAC') {
                return 'Is a person who may discuss family entitlements and transaction processing results with the department.';
            }
        }
        catch (err)
        {
            return '';
        }
        
    }

    getPotision(type: string): any {
        try {

            if (type === 'Z7') {
                return 'Chairperson';
            }

            else if (type === 'Z8') {
                return 'Chief Executive Officer';
            }

            else if (type === 'Z9') {
                return 'Child Care Service Director';
            }

            else if (type === 'Z10') {
                return 'Director Company Director';
            }

            else if (type === 'Z11') {
                return 'Company Financial Officer';
            }

            else if (type === 'Z12') {
                return 'Company Secretary';
            }

            else if (type === 'Z13') {
                return 'Coordinator';
            }

            else if (type === 'Z14') {
                return 'Chief Executive Officer';
            }

            else if (type === 'Z15') {
                return 'General Manager';
            }

            else if (type === 'Z16') {
                return 'Manager';
            }

            else if (type === 'Z17') {
                return 'Nominated Supervisor';
            }

            else if (type === 'Z18') {
                return 'Operator';
            }

            else if (type === 'Z19') {
                return 'President';
            }

            else if (type === 'Z20') {
                return 'Principal';
            }

            else if (type === 'Z21') {
                return 'Program Manager';
            }

            else if (type === 'Z22') {
                return 'Treasurer';
            }
            else if (type === 'Z23') {
                return 'Other';
            }
            else {
                return '';
            }
        }
        catch (err)
        {
            return '';
        }
        
    }

    getRoleState(type: string ): any {
        try {
            if (type === 'NSW') {
                return 'New South Wales';
            }

            else if (type === 'ACT') {
                return 'Australian Capital Territory';
            }

            else if (type === 'WA') {
                return 'Western Australia';
            }

            else if (type === 'QLD') {
                return 'Queensland';
            }

            else if (type === 'VIC') {
                return 'Victoria';
            }

            else if (type === 'TAS') {
                return 'Tasmania';
            }
            else if (type === 'NT') {
                return 'Northern Territory';
            }

            else if (type === 'SA') {
                return 'South Australia';
            }
        }
        catch (err)
        {
            return '';
        }
    }

    getHelperText(title: string, value: boolean): any {
        try {

            if (title === 'DEC') {
                return value ? 'YES' : 'NO';
            }

            else if (title === 'wwcc') {
                return 'A working with children card check issued by the authority responsible for working with children cards in the State or Territory in relation to care provided by a child care service of the provider.';
            }
            else if (title === 'policeCheck') {
                return 'An Australian National Policy Criminal History Check obtained from the relevant state or territory police service or an agency accredited by the Australian Criminal Intelligence Commission, and obtained no more than six months previously.';
            }
            else if (title === 'AFSA') {
                return 'A National Personal Insolvency Index check performed using the Bankruptcy Register Search service provided by the Australian Financial Security Authority (AFSA).';
            }
            else if (title === 'ASIC') {
                return 'A Current and Historical personal name extract search of the records of the Australian Securities and Investments Commission (ASIC).';
            }
            else if (title === 'adverseEvents') {
                return 'Have the above checks revealed any adverse events?';
            }
            else { return ''; }
        }
        catch (err)
        {
            return '';
        }
        
    }

    getDocumentType(title: string): any {
        try {

            if (title === 'AM0018') {
                return 'Police criminal history check';
            }
            else if (title === 'AM0006') {
                return 'Letter patent (personnel)';
            }
            else if (title === 'AM0019') {
                return 'National personal insolvency index';
            }
            else if (title === 'AM0020') {
                return 'Current and historical personal name extract';
            }
            else if (title === 'AM0030') {
                return 'CCS related document for personnel';
            }
            else { return ''; }
        }
        catch (err)
        {
            return '';
        }
        
    }



}
