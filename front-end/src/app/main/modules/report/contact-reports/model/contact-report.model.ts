import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';
import { Room } from 'app/main/modules/room/models/room.model';
import { User } from 'app/main/modules/user/user.model';
import { Enrolment } from 'app/main/modules/child/enrolment/models/enrolment.model';
import { ChildCulturalDetails } from 'app/main/modules/child/child-details/cultural-background-view/child-cultural-details.model';

export class ContactReport {

    id: string;
    attrId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: string;
    dob: string;

    attendance?: any;
    image?: string;
    desc?: string;
    joinDate?: string;
    created?: string;

    CRN?: string;

    status?: string;
    nappyRequired?: boolean;
    bottleFeedRequired?: boolean;
    hasAllergiesMedications?: boolean;

    isBirthday?: boolean; 
    age?: string;

    room: string;
    parentsFirstName: string;
    parentsLastName: string;
    enrollments: string;
    emergency: string;
    cultural: string;

    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
    index?: number;

    homeAddress?: string;
    suburb?: string;
    state?: string;
    postalcode?: string;
    courtOrders?: boolean;
    kioskSetup?: any;
    parentsHomeAddress?: string;
    parentsHomeDOB?: string;
    parentsGender?: string;
    parentsRelationship?: string;
    parentsPhoneNumber?: string;
    parentsMobile?: string;

    WorkParentsPhoneNumber?: string;
    WorkParentsMobile?: string;

    parentsEmail?: string;
    parentsOccupation?: string;
    parentsAddress2?: string;
    parentsSecondaryEmail?: string;
    homeAddressE?: string;
    phoneNumberE?: string;
    MobileNumberE?: string;
    emailE?: string;
    relationshipE?: string;
    dateJoinedUser?: string;
    type?:string;
    qualificationH?: string;
    qualificationM?: string;
    qualificationR?: string;
    qualificationP?: string;
    eFirstName?: string;
    eLastName?: string;
    pincode?: string;
    /**
     * Constructor
     * 
     * @param {*} [child]
     * @param {number} [index]
     */
    constructor(child?: any, index?: number) 
    {
        this.id = child.id || '';
        this.attrId = child.attr_id || '';
        this.firstName = child.f_name || '';
        this.middleName = child.m_name || '';
        this.lastName = child.l_name || '';
        this.gender = child.gender || '';
        this.dob = child.dob || '';
        this.kioskSetup = child.kiosk_setup || {};
        this.attendance = child.attendance || [];
        this.image = child.image || '';
        this.desc = child.desc || '';
        this.joinDate = child.join || '';
        this.created = child.account_created || '';
        this.eFirstName = child.ef_name || '';
        this.eLastName = child.el_name || ''

        this.CRN = child.crn || '';

        this.homeAddress = child.home_address || '';
        this.suburb = child.suburb || '';
        this.state = child.state || '';
        this.postalcode = child.postalcode || '';
        this.courtOrders = child.court_orders || false;

        this.status = child.status || '';
        this.nappyRequired = child.nappy_required || false;
        this.bottleFeedRequired = child.bottle_feed_required || false;
        this.hasAllergiesMedications = child.has_allergies_medications || false;

        this.isBirthday = child.is_birthday || false;
        this.age = child.age || '';
        this.room = child.rooms ? child.rooms : '';
        this.parentsFirstName = child.first_name_p ? child.first_name_p : '';
        this.parentsLastName = child.last_name_p ? child.last_name_p : '';
        this.enrollments = child.enrollments ? child.enrollments: '';
        this.emergency = child.emergency ? child.emergency : '';
        this.cultural = (child.cultural != null) ? child.cultural : '';
        this.type = (child.type != null) ? child.type : '';

        this.parentsHomeAddress = (child.home_address_p != null) ? child.home_address_p : '';
        this.parentsHomeDOB = (child.dob_p != null) ? child.dob_p : '';
        this.parentsGender = (child.gender_p != null) ? child.gender_p : '';
        this.parentsRelationship = (child.relatioship_p != null) ? child.relatioship_p : '';
        this.parentsPhoneNumber = (child.phone_p != null) ? child.phone_p : '';

        this.parentsMobile = (child.mobile_p != null) ? child.mobile_p : '';
        this.WorkParentsMobile = (child.work_mobile != null) ? child.work_mobile : '';
        this.WorkParentsPhoneNumber = (child.work_phone != null) ? child.work_phone : '';

        this.parentsEmail = (child.email_p != null) ? child.email_p : '';
        this.parentsOccupation = (child.occupation_p != null) ? child.occupation_p : '';
        this.parentsAddress2 = (child.address2_p != null) ? child.address2_p : '';
        this.parentsSecondaryEmail = (child.secondary_email_p != null) ? child.secondary_email_p : '';

        this.homeAddressE = (child.home_address_e != null) ? child.home_address_e : '';
        this.phoneNumberE = (child.phone_number != null) ? child.phone_number : '';
        this.MobileNumberE = (child.mobile_number_e != null) ? child.mobile_number_e : '';
        this.emailE = (child.email_e != null) ? child.email_e : '';
        this.relationshipE = (child.relationship != null) ? child.relationship : '';
        this.dateJoinedUser = (child.date_joined_user != null) ? child.date_joined_user : ''; 

        this.qualificationH = child.kiosk_setup? this.fidKiosk('qualification_level') : ''; 
        this.qualificationM = child.kiosk_setup? this.fidKiosk('medical_qualification') : ''; 
        this.qualificationR = child.kiosk_setup? this.fidKiosk('registered_position') : ''; 
        this.qualificationP = child.kiosk_setup? this.fidKiosk('resposible_person_order') : '';
        this.pincode = child.pincode || '';
        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.index = index || 0;
    }

    fidKiosk(type): string {
        return this.kioskSetup === null  ? '' : this.kioskSetup[type];
    }

}
