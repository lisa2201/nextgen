import * as _ from 'lodash';
import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';
import { Attendance } from 'app/main/modules/child/attendance/attendance.model';

export class ShareModel {

     PACDR = [
        {
            name: 'Child First name ',
            value: 'km8_child_profile.first_name',
            res: 'firstName'
        },
        {
            name: 'Child Middle name',
            value: 'km8_child_profile.middle_name',
            res: 'middleName'
        },
        {
            name: 'Child Last name',
            value: 'km8_child_profile.last_name',
            res: 'lastName'
        },
        {
            name: 'Date Joined',
            value: 'km8_child_profile.join_date',
            res: 'joinDate'
        },
        {
            name: 'Date of Birth ',
            value: 'km8_child_profile.dob',
            res: 'dob'
        },

        {
            name: 'Gender ',
            value: 'km8_child_profile.gender',
            res: 'gender'
        },
        {
            name: 'Child CRN',
            value: 'km8_child_profile.ccs_id',
            res: 'CRN'
        },
        {
            name: 'Child’s Home address',
            value: 'km8_child_profile.address_1',
            res: 'home_address'
        },
        {
            name: 'Attendance ',
            value: 'km8_child_profile.attendance',
            res: 'attendance'
        },
        {
            name: 'Room',
            value: 'km8_child_profile.room ',
            res: 'rooms'
        },
        {
            name: 'Parent’s First Name',
            value: 'km8_users.first_name',
            res: 'parentsFirstName'
        },
        {
            name: 'Parent’s Last Name',
            value: 'km8_users.last_name',
            res: 'parentsLastName'
        },
        {
            name: 'Parent’s Home Address',
            value: 'km8_users.address_1',
            res: 'parentsHomeAddress'
        },
        {
            name: 'Parent’s Date of  birth',
            value: 'km8_users.dob',
            res: 'parentsHomeDOB'
        },
        {
            name: 'Parent’s Gender',
            value: 'km8_users.gender',
            res: 'parentsGender'
        },
        {
            name: 'Parent’s relationship to child ',
            value: 'km8_users.relationship',
            res: 'parentsRelationship'
        },
        {
            name: 'Parent’s Phone Number',
            value: 'km8_users.phone',
            res: 'parentsPhoneNumber'
        },
        {
            name: 'Parent’s Mobile Number',
            value: 'km8_users.mobile',
            res: 'parentsPhoneNumber'
        },
        {
            name: 'Parent’s Email Address',
            value: 'km8_users.email',
            res: 'parentsEmail'
        },
        {
            name: 'Parent’s Occupation',
            value: 'km8_users.occupation',
            res: 'parentsOccupation'
        },
        {
            name: 'Parent’s Work Address',
            value: 'km8_users.address2',
            res: 'parentsAddress2'
        },
        {
            name: 'Parent’s Work email',
            value: 'km8_users.second_email',
            res: 'parentsSecondaryEmail'
        },
        {
            name: 'Parent’s Work phone number',
            value: 'km8_users.mobile',
            res: 'parentsPhoneNumber'
        }
    ];

     CECR = [
        {
            name: 'First Name',
            value: 'km8_child_profile.first_name',
            res: 'firstName'
        },

        {
            name: 'Last Name',
            value: 'km8_child_profile.last_name',
            res: 'lastName'
        },

        {
            name: 'Home address',
            value: 'km8_child_profile.address_1',
            res: 'homeAddressE'
        },
        {
            name: 'Phone Number',
            value: 'km8_child_profile.phone_number',
            res: 'phoneNumberE'
        },

        {
            name: 'Email',
            value: 'km8_users.email',
            res: 'emailE'
        },
        
        {
            name: 'Relationship ',
            value: 'km8_users.relationship',
            res: 'relationshipE'
        },
    ];

     EDR = [

        {
            name: 'Educator’s First Name',
            value: 'km8_users.first_name',
            res: 'parentsFirstName'
        },

        {
            name: 'Educator’s Last Name',
            value: 'km8_users.last_name',
            res: 'parentsLastName'
        },

        {
            name: 'Gender',
            value: 'km8_users.gender',
            res: 'parentsGender'
        },
        {
            name: 'Date Joined',
            value: 'km8_users.created_at',
            res: 'dateJoinedUser'
        },

        {
            name: 'Educator’s Address',
            value: 'km8_users.address1',
            res: 'parentsHomeAddress'
        },
        {
            name: 'Educator’s phone number',
            value: 'km8_users.phone_number',
            res: 'parentsPhoneNumber'
        },
    ];
    selectedField:any;

    /**
     * Constructor
     * 
     * @param {*} [booking]
     * @param {number} [index]
     */
    constructor(feild?: any, index?: number) 
    {
        this.selectedField = feild.id || '';
    }


    getField(value):void {
        if (value === 'PACDR') {
            this.selectedField = this.PACDR;
        }
        else if (value === 'CECR') {
            this.selectedField = this.CECR;
        }
        else if (value === 'EDR') {
            this.selectedField = this.EDR;
        }
        else if (value === 'EQR') {
            this.selectedField = this.EDR;
        }
        else {
            this.selectedField = [];
        }
    }
}
