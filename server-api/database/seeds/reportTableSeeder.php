<?php

use Illuminate\Database\Seeder;
use Kinderm8\ReportField;
class reportTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */

    public function run()
    {
        if(config('database.default') === 'mysql')
        {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
        }
        else
        {
            DB::statement('SET CONSTRAINTS ALL DEFERRED;');
        }

        DB::table('km8_report_field')->truncate();


        $report = [

            // Attendance report data
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getReportField('ATT_ASR'),
                'report_type' => 'ATT_ASR',
                'master_type' => 'ATT',
                'name' => 'Attendance Summary Report',
                'isFav' => '0'
            ],

            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getReportField('ATT_RBR'),
                'report_type' => 'ATT_RBR',
                'master_type' => 'ATT',
                'name' => 'Roll Book Report',
                'isFav' => '0'
            ],
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getReportField('ATT_OUR'),
                'report_type' => 'ATT_OUR',
                'master_type' => 'ATT',
                'name' => 'Occupancy Utilisation Report',
                'isFav' => '0'
            ],

        // Contact report data
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getContactReportField('CON_PACDR'),
                'report_type' => 'CON_PACDR',
                'master_type' => 'CON',
                'name' => 'Parent & Child Details Report',
                'isFav' => '0'
            ],
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getContactReportField('CON_CECR'),
                'report_type' => 'CON_CECR',
                'master_type' => 'CON',
                'name' => 'Child Emergency Contacts Report',
                'isFav' => '0'
            ],
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getContactReportField('CON_EDR'),
                'report_type' => 'CON_EDR',
                'master_type' => 'CON',
                'name' => 'Educator Details Report',
                'isFav' => '0'
            ],
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getContactReportField('CON_EQR'),
                'report_type' => 'CON_EQR',
                'master_type' => 'CON',
                'name' => 'Educator Qualifications Report',
                'isFav' => '0'
            ],

            // finance report
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getFinanceReportField('FIN_ADR'),
                'report_type' => 'FIN_ADR',
                'master_type' => 'FIN',
                'name' => 'Aged Debtors Report',
                'isFav' => '0'
            ],
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getFinanceReportField('FIN_ISR'),
                'report_type' => 'FIN_ISR',
                'master_type' => 'FIN',
                'name' => 'Income Summary Report',
                'isFav' => '0'
            ],
            [
                'organization_id' => null,
                'branch_id' =>null,
                'field' => $this->getFinanceReportField('FIN_WRSR'),
                'report_type' => 'FIN_WRSR',
                'master_type' => 'FIN',
                'name' => 'Weekly Revenue Summary',
                'isFav' => '0'
            ],

        ];

        foreach ($report as $key => $value)
        {
            ReportField::create($value);
        }

        if(config('database.default') === 'mysql')
        {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        }
        else
        {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }
    }

    public function getReportField(string $type) {
        if($type === 'ATT_ASR') {
            $field = [
                [
                    'name'=>'Date',
                    'res'=>'date',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Child Name',
                    'res'=>'child',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room',
                    'res'=>'room',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Sign In Time',
                    'res'=>'checkInTime',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Sign In User',
                    'res'=>'checkInUser',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Sign Out Time',
                    'res'=>'checkOutTime',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Sign Out User',
                    'res'=>'checkOutUser',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Session Hours',
                    'res'=>'checkOutUser',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Session Fee',
                    'res'=>'price',
                    'isSaved'=>false
                ],
            ];
        }
        else if($type === 'ATT_RBR') {

            $field = [
                [
                    'name'=>'Room',
                    'res'=>'room',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Child Name',
                    'res'=>'child',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Date',
                    'res'=>'date',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Day',
                    'res'=>'day',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Session Fee',
                    'res'=>'price',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Session Start',
                    'res'=>'sessionStart'
                ],
                [
                    'name'=>'Session End',
                    'res'=>'sessionEnd',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Status',
                    'res'=>'status',
                    'isSaved'=>false
                ],
            ];

        }
        else if ($type === 'ATT_OUR') {
            $field = [
                [
                    'name'=>'Date',
                    'res'=>'date',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Day',
                    'res'=>'day',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Centre Capacity',
                    'res'=>'centreCapacity',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Centre Total Booking',
                    'res'=>'centreTotalBooking',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Centre Utilisation Percentage %',
                    'res'=>'centreUP',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room Name',
                    'res'=>'roomBooking',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room Capacity',
                    'res'=>'roomCapacity',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room Bookings',
                    'res'=>'roomBookings',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room Utilisation Percentage %',
                    'res'=>'roomUP',
                    'isSaved'=>false
                ],
            ];

        }
        return $field;
    }

    public function getContactReportField(string $type) {
        if($type === 'CON_PACDR') {
            $field = [
                [
                    'name'=>'Child First name',
                    'res'=>'firstName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Child Middle name',
                    'res'=>'middleName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room',
                    'res'=>'room',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Child Last name',
                    'res'=>'lastName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Date Joined',
                    'res'=>'joinDate',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Date of Birth',
                    'res'=>'dob',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Gender',
                    'res'=>'gender',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Child CRN',
                    'res'=>'CRN',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Child’s Home address',
                    'res'=>'home_address',
                    'isSaved'=>false
                ],

                [
                    'name'=>'Attendance',
                    'res'=>'attendance',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Room',
                    'res'=>'room',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s First Name',
                    'res'=>'parentsFirstName',
                    'isSaved'=>false
                ],

                [
                    'name'=>'Parent’s Last Name',
                    'res'=>'parentsLastName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Home Address',
                    'res'=>'parentsHomeAddress',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Date of  birth',
                    'res'=>'parentsHomeDOB',
                    'isSaved'=>false
                ],

                [
                    'name'=>'Parent’s Gender',
                    'res'=>'parentsGender',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s relationship to child',
                    'res'=>'parentsRelationship',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Phone Number',
                    'res'=>'parentsPhoneNumber',
                    'isSaved'=>false
                ],


                [
                    'name'=>'Parent’s Mobile Number',
                    'res'=>'parentsMobile',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Email Address',
                    'res'=>'parentsEmail',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Occupation',
                    'res'=>'parentsOccupation',
                    'isSaved'=>false
                ],

                [
                    'name'=>'Parent’s Work Address',
                    'res'=>'parentsAddress2',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Work email',
                    'res'=>'parentsSecondaryEmail',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Parent’s Work phone number',
                    'res'=>'parentsPhoneNumber',
                    'isSaved'=>false
                ],
            ];
        }
        else if($type === 'CON_CECR') {

            $field = [
                [
                    'name'=>'Child First name',
                    'res'=>'firstName',
                    'isSaved'=>false
                ],

                [
                    'name'=>'First Name',
                    'res'=>'eFirstName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Last Name',
                    'res'=>'eLastName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Home address',
                    'res'=>'homeAddressE',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Phone Number',
                    'res'=>'phoneNumberE',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Email',
                    'res'=>'emailE',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Relationship',
                    'res'=>'relationshipE'
                ],
                [
                    'name'=>'Type',
                    'res'=>'type',
                    'isSaved'=>false
                ],
            ];

        }
        else if ($type === 'CON_EDR') {
            $field = [
                [
                    'name'=>'Educator’s First Name',
                    'res'=>'parentsFirstName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Educator’s Last Name',
                    'res'=>'parentsLastName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Gender',
                    'res'=>'parentsGender',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Date Joined',
                    'res'=>'dateJoinedUser',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Educator’s Address',
                    'res'=>'parentsHomeAddress',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Educator’s phone number',
                    'res'=>'parentsPhoneNumber',
                    'isSaved'=>false
                ],
            ];

        }
        else if ($type === 'CON_EQR') {
            $field = [
                [
                    'name'=>'Educator’s First Name',
                    'res'=>'parentsFirstName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Educator’s Last Name',
                    'res'=>'parentsLastName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Gender',
                    'res'=>'parentsGender',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Date Joined',
                    'res'=>'dateJoinedUser',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Highest Qualification level',
                    'res'=>'qualificationH',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Medical Qualifications',
                    'res'=>'qualificationM',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Registered Positions',
                    'res'=>'qualificationR',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Responsible Person Orde',
                    'res'=>'qualificationP',
                    'isSaved'=>false
                ],
            ];

        }
        return $field;
    }

    public function getFinanceReportField(string $type) {
        if($type === 'FIN_ADR') {
            $field = [
                [
                    'name'=>'First Name',
                    'res'=>'firstName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Total Owing',
                    'res'=>'balance',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Email',
                    'res'=>'email',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Mobile Number',
                    'res'=>'phoneNumber',
                    'isSaved'=>false
                ],
            ];
        }
        else if($type === 'FIN_ISR') {

            $field = [
                [
                    'name'=>'First Name',
                    'res'=>'firstName',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Email',
                    'res'=>'email',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Mobile Number',
                    'res'=>'phoneNumber',
                    'isSaved'=>false
                ],
                [
                    'name'=>'CCS Payment',
                    'res'=>'ccsPayment',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Booking fee',
                    'res'=>'bookingFee',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Income',
                    'res'=>'income'
                ],
            ];

        }
        else if ($type === 'FIN_WRSR') {
            $field = [
                [
                    'name'=>'Week Ending',
                    'res'=>'WeekEnding',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Total Fee',
                    'res'=>'TotalFee',
                    'isSaved'=>false
                ],
                [
                    'name'=>'CCS/CCB',
                    'res'=>'CCB',
                    'isSaved'=>false
                ],
                [
                    'name'=>'CCR',
                    'res'=>'CCR',
                    'isSaved'=>false
                ],
                [
                    'name'=>'JFA',
                    'res'=>'JFA',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Discount',
                    'res'=>'Discount',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Subsidy',
                    'res'=>'Subsidy',
                    'isSaved'=>false
                ],
                [
                    'name'=>'Session Hours',
                    'res'=>'SessionHours',
                    'isSaved'=>false
                ],
            ];

        }
        return $field;
    }
}
