import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';

export class EmergencyContact  {
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
    dob?: string;
    email: string;
    needSecEmail: boolean;
    secondaryEmail: string;
    address1?: string;
    address2?: string;
    phone?: string;
    phone2?: string;
    city: string;
    zipCode: string;
    relationship: string;
    types: [];
    consents: object;
    consentDropOffAndPickUp: boolean;
    consentIncursion: boolean;
    consentMakeMedicalDecision: boolean;
    consentEmergencyContact: boolean;
    consentCollectChild: boolean;
    consentTransportationArrange: boolean;
    pincode: any;
    child: any;

    /**
     * Constructor
     *
     * @param emergency
     */
    constructor(emergency?: any, index?: number)
    {
        this.id = emergency.id || '';
        this.firstName = emergency.first_name || '';
        this.lastName = emergency.last_name || '';
        this.dob = emergency.dob;
        this.image = emergency.image;
        this.needSecEmail = emergency.need_sec_email;
        this.secondaryEmail = emergency.secondary_email;
        this.address1 = emergency.address1 || '';
        this.address2 = emergency.address2;
        this.phone = emergency.phone;
        this.phone2 = emergency.phone2;
        this.pincode = emergency.pincode;
        this.city = emergency.city;
        this.zipCode = emergency.zip_code;
        this.email = emergency.email || '';
        this.relationship = emergency.relationship || '';
        this.types = emergency.types || '';
        this.consents = emergency.consents || '';
        this.consentDropOffAndPickUp = (emergency.consents?.consent_drop_off_and_pick_up_child) || false;
        this.consentIncursion = (emergency.consents?.consent_incursion) || false;
        this.consentMakeMedicalDecision = (emergency.consents?.consent_make_medical_decision) || false;
        this.consentEmergencyContact = (emergency.consents?.consent_emergency_contact) || false;
        this.consentCollectChild = (emergency.consents?.consent_collect_child) || false;
        this.consentTransportationArrange = (emergency.consents?.consent_transportation) || false;
        this.child = emergency.child || '';
    }


    /**
     * get emergency contact full name
     *
     * @returns {string}
     * @memberof Emergency
     */
    public getFullName(): string
    {
        return (!_.isNull(this.firstName) ? this.firstName : '') + (!_.isNull(this.lastName) ? ' ' + this.lastName : '');
    }
}
