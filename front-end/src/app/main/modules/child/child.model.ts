import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';

import { Room } from '../room/models/room.model';
import { User } from '../user/user.model';
import { Enrolment } from './enrolment/models/enrolment.model';
import { EmergencyContact } from './emergency-view-holder/emergency.model';
import { ChildCulturalDetails } from './child-details/cultural-background-view/child-cultural-details.model';
import { HealthAndMedical } from './health-medical/health-and-medical.model';
import { HealthMedical } from './health-medical/health-medical.model';

export class Child {

    id: string;
    attrId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    legalFirstName: string;
    legalLastName: string;
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

    rooms: Room[];
    parents: User[];
    enrollments: Enrolment[];
    emergency: EmergencyContact[];
    cultural: ChildCulturalDetails;
    healthAndMedical: HealthAndMedical;
    allergy: HealthMedical[];


    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
    index?: number;

    homeAddress?: string;
    suburb?: string;
    state?: string;
    postalCode?: string;
    courtOrders?: boolean;
    documents?: any;
    immunisationTracking?: boolean;
    consents?: any
    notes?: any

    bus?: any;
    school?: any;
    isDeleted: boolean;
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
        this.legalFirstName = child.legal_first_name || '';
        this.legalLastName = child.legal_last_name || '';
        this.gender = child.gender || '';
        this.dob = child.dob || '';

        this.attendance = child.attendance || [];
        this.image = child.child_profile_image? child.child_profile_image : '';
        this.documents = child.documents? child.documents : '';
        this.notes = child.notes? child.notes : '';
        this.consents = child.consents? child.consents : '';
        this.desc = child.desc || '';
        this.joinDate = child.join || '';
        this.created = child.account_created || '';

        this.CRN = child.crn || '';

        this.homeAddress = child.home_address || '';
        this.suburb = child.suburb || '';
        this.state = child.state || '';
        this.postalCode = child.postalcode || '';
        this.courtOrders = child.court_orders || false;

        this.status = child.status || '';
        this.nappyRequired = child.nappy_required || false;
        this.bottleFeedRequired = child.bottle_feed_required || false;
        this.hasAllergiesMedications = child.has_allergies_medications || false;

        this.isBirthday = child.is_birthday || false;
        this.age = child.age || '';
        this.rooms = child.rooms ? child.rooms.map((i: any, idx: number) => new Room(i, idx)) : [];
        this.parents = child.parents ? child.parents.map((i: any, idx: number) => new User(i, idx)) : [];
        this.enrollments = child.enrollments ? child.enrollments.map((i: any, idx: number) => new Enrolment(i, idx)) : [];
        this.emergency = child.emergency ? child.emergency.map((i: any, idx: number) => new EmergencyContact(i, idx)) : [];
        this.cultural = (child.cultural != null) ? new ChildCulturalDetails(child.cultural) : child.cultural || '';
        this.healthAndMedical = (child.health_medical != null) ? new HealthAndMedical(child.health_medical) : child.health_medical || '';
        this.bus = (child.bus!= null) ? child.bus : '';
        this.school = (child.school!= null) ? child.school : '';
        this.immunisationTracking = child.immunisation_tracking;
        this.isDeleted = child.deleted_on? true : false;

        this.allergy = child.allergy ? child.allergy.map((i: any, idx: number) => new HealthMedical(i, idx)) : [];
        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.index = index || 0;
    }

    /**
     * check if account active
     *
     * @returns {boolean}
     */
    isActive(): boolean
    {
        return this.status !== '2' ? (this.status === '1' ? true : false) : false;
    }

    /**
     * check if account wait-list
     *
     * @returns {boolean}
     */
    isWaitList(): boolean
    {
        return this.status === '2';
    }

    /**
     * check if child has rooms
     *
     * @returns {boolean}
     */
    hasRooms(): boolean
    {
        return this.rooms.length > 0;
    }

    /**
     * check if child has parents
     *
     * @returns {boolean}
     */
    hasParents(): boolean
    {
        return this.parents.length > 0;
    }

    /**
     * get child full name
     *
     * @returns {string}
     * @memberof User
     */
    getFullName(): string
    {
        return (!_.isNull(this.firstName) ? (this.firstName) : '')
            + (!_.isNull(this.middleName) ? ' ' + (this.middleName) : '')
            + (!_.isNull(this.lastName) ? ' ' + (this.lastName) : '');    
    }

    /**
     * get child short name
     *
     * @returns {string}
     * @memberof User
     */
    getShortName(): string
    {
        return (!_.isNull(this.firstName) ? (this.firstName) : '') + (!_.isNull(this.lastName) ? ' ' + (this.lastName) : '');    
    }

    /**
     * get child image
     *
     * @returns {string}
     */
    getImage(): string
    {
        try
        {
            return this.image !== '' ? this.image : `assets/icons/flat/ui_set/custom_icons/child/${(this.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
        }
        catch (err)
        {
            return AppConst.image.PROFILE_CALLBACK;
        }
    }
    
    /**
     * get child attendance
     *
     * @returns {string}
     */
    getAttendanceLabel(): string
    {
        try
        {
            return this.attendance.map((v: { name: string; }) => _.capitalize(v.name)).join(', ');
        }
        catch (err)
        {
            return '';
        }
    }

    getAttendanceLabelSubstring(): string
    {
        try
        {
            return this.attendance.map((v: { name: string; }) => _.capitalize(v.name.substring(0, 2))).join(' | ');
        }
        catch (err)
        {
            return '';
        }
    }

    /**
     * get gender label
     *
     * @returns {string}
     */
    getGenderLabel(): string
    {
        return this.gender === '0' ? 'Male' : 'Female';
    }

    /**
     * get child enrolment 
     *
     * @returns {Enrolment}
     */
    getEnrolment(): Enrolment
    {
        return _.head(this.enrollments);
    }

    /**
     * check child has enrolment 
     *
     * @returns {Enrolment}
     */
    hasEnrolment(): boolean
    {
        return !_.isNull(this.enrollments) && !_.isEmpty(this.enrollments);
    }

    /**
     * get status label
     *
     * @returns {string}
     */
    getStatus(): string
    {
        let label: string;

        if(this.status === '2') 
        {
            label = 'Waitlist';
        }
        else if(this.status === '1') 
        {
            label = 'Active';
        }
        else 
        {
            label = 'Inactive';
        }

        return label;
    }
}
