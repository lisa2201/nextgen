<?php

use Kinderm8\Models\WaitlistQuestions;
use Kinderm8\Models\WaitlistEnrolmentQuestions;
use Kinderm8\WaitlistEnquiryQuestions;

class WaitlistHelper
{


    public static function codeForOlderWaitlistInfoGenarate($data, $orgId = null, $branchId = null, $status, $old = false)
    {
        $orgId = $orgId ?? auth()->user()->organization_id;
        $branchId = $branchId ?? auth()->user()->branch_id;


//        $status =0/1 waitlist
        $newData = array();

        if (!$old) {
            $defaultSettings = (in_array($status, array(5, 6))) ? self::enquiriesDefaultCollection($data) : self::defaultSettings($data);

            $newData['new_inputs'] = array_merge($defaultSettings, $data['new_inputs'] ?? []);
            if (in_array($status, array(5, 6))) {
                $enqCollection = isset($newData['new_inputs']) && count($newData['new_inputs']) > 0 ? self::enquiryForDefaultCollection($newData['new_inputs'], $orgId, $branchId) : [];
                $newData['section_inputs']['enquiry'] = isset($enqCollection['enquiry']) ? $enqCollection['enquiry'] : [];
                $newData['new_inputs'] = isset($enqCollection['inputs']) ? $enqCollection['inputs'] : [];
            } else if (in_array($status, array(0, 1))) {
                $waitlistCollection = isset($newData['new_inputs']) && count($newData['new_inputs']) > 0 ? self::waitlistDefaultCollection($newData['new_inputs'], $orgId, $branchId) : [];
                $newData['section_inputs']['waitlist'] = isset($waitlistCollection['waitlist']) ? $waitlistCollection['waitlist'] : [];
                $newData['new_inputs'] = isset($waitlistCollection['inputs']) ? $waitlistCollection['inputs'] : [];
            } else {
                $enrolmentCollection = isset($newData['new_inputs']) && count($newData['new_inputs']) > 0 ? self::enrolmentDefaultCollection($newData['new_inputs'], $orgId, $branchId) : [];
                $newData['section_inputs']['enrolment'] = isset($enrolmentCollection['enrolment']) ? $enrolmentCollection['enrolment'] : [];
                $newData['new_inputs'] = isset($enrolmentCollection['inputs']) ? $enrolmentCollection['inputs'] : [];
            }
        } else {
            $defaultSettings = (in_array($status, array(5, 6))) ? self::enquiriesDefaultCollection($data) : self::defaultSettings($data);
            $newData['emergencyContacts'] = self::emrgencyContactData($data); /* emergency data set*/
            $newData['new_inputs'] = array_merge($defaultSettings, $data['new_inputs'] ?? []);
            if (in_array($status, array(5, 6))) {
                $enqCollection = isset($newData['new_inputs']) && count($newData['new_inputs']) > 0 ? self::enquiryForDefaultCollection($newData['new_inputs'], $orgId, $branchId) : [];
                $newData['section_inputs']['enquiry'] = $enqCollection['enquiry'];
                $newData['new_inputs'] = isset($enqCollection['inputs']) ? $enqCollection['inputs'] : [];
            } else if (in_array($status, array(0, 1))) {
                $newData['section_inputs']['waitlist'] = isset($data['waitlist_element_settings']) && isset($data['new_inputs']) ? self::waitlistOlderCodeForDefaultCollection($defaultSettings, $data['new_inputs'], $data['waitlist_element_settings']) : [];
            } else {
                $newData['section_inputs']['enrolment'] = isset($data['element_settings']) && isset($data['new_inputs']) ? self::enrolmenyOlderCodeForDefaultCollection($defaultSettings, $data['new_inputs'], $data['element_settings']) : [];
            }
        }

        return array_merge($data, $newData);
    }

    public static function waitlistOlderCodeForDefaultCollection($defauiltInputs, $newInputs, $elementSettings)
    {
        /*waitlist*/
        try {
            /*default fileds*/
            $defaultyWaitlistInputsOnly = array_values(array_filter($defauiltInputs, function ($k) {
                return isset($k['waitlist_section']) && $k['waitlist_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            if (count(array_values(array_filter($defauiltInputs, function ($k) {
                    return isset($k['waitlist_section']) && $k['waitlist_section'] !== '' && !isset($k['order']);
                }, ARRAY_FILTER_USE_BOTH))) === 0) {
                /* new inputs settings get*/
                $keys = array_column($defaultyWaitlistInputsOnly, 'order');
                array_multisort($keys, SORT_ASC, $defaultyWaitlistInputsOnly);
            }

            /* new values */
            $newWaitlistInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return isset($k['waitlist_section']) && $k['waitlist_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            if (count(array_values(array_filter($newInputs, function ($k) {
                    return isset($k['waitlist_section']) && $k['waitlist_section'] !== '' && !isset($k['order']);
                }, ARRAY_FILTER_USE_BOTH))) === 0) {
                /* new inputs settings get*/
                $keys = array_column($newWaitlistInputsOnly, 'order');
                array_multisort($keys, SORT_ASC, $newWaitlistInputsOnly);
            }

            return array(
                'parent_guardian' =>
                    array(
                        'code' => 'parent_guardian',
                        'name' => 'Parent 1/Primary Carer',
                        'order' => 5,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defaultyWaitlistInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['waitlist_section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['waitlist_section'] === 'parent_guardian';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newWaitlistInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['waitlist_section']) && !isset($k['second_name']) && $k['waitlist_section'] === 'parent_guardian';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            )
                    ),
                'child_information' =>
                    array(
                        'code' => 'child_information',
                        'name' => 'Child information',
                        'order' => 1,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defaultyWaitlistInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['waitlist_section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['waitlist_section'] === 'child_information';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newWaitlistInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['waitlist_section']) && !isset($k['second_name']) && $k['waitlist_section'] === 'child_information';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            )
                    ),
            );
        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    public static function enrolmenyOlderCodeForDefaultCollection($defauiltInputs, $newInputs, $elementSettings)
    {
        /*enrolment*/
        try {
            /*default values*/
            $defualtEnrolmentInputsOnly = array_values(array_filter($defauiltInputs, function ($k) {
                return isset($k['section']) && $k['section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            if (count(array_values(array_filter($defauiltInputs, function ($k) {
                    return isset($k['section']) && $k['section'] !== '' && !isset($k['order']);
                }, ARRAY_FILTER_USE_BOTH))) === 0) {
                /* new inputs settings get*/

                $keys = array_column($defualtEnrolmentInputsOnly, 'order');
                array_multisort($keys, SORT_ASC, $defualtEnrolmentInputsOnly);
            }

            /*new values*/
            $newEnrolmentInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return isset($k['section']) && $k['section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            if (count(array_values(array_filter($newInputs, function ($k) {
                    return isset($k['section']) && $k['section'] !== '' && !isset($k['order']);
                }, ARRAY_FILTER_USE_BOTH))) === 0) {
                /* new inputs settings get*/

                $keys = array_column($newEnrolmentInputsOnly, 'order');
                array_multisort($keys, SORT_ASC, $newEnrolmentInputsOnly);
            }

            return array(
                'consents' =>
                    array(
                        'code' => 'consents',
                        'name' => 'Consents',
                        'order' => 8,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'consents';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'consents';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'booking_details' =>
                    array(
                        'code' => 'booking_details',
                        'name' => 'Booking Details',
                        'order' => 3,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'booking_details';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'booking_details';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'parent_guardian' =>
                    array(
                        'code' => 'parent_guardian',
                        'name' => 'Parent 1/Primary Carer',
                        'order' => 5,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'parent_guardian';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'parent_guardian';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'child_information' =>
                    array(
                        'code' => 'child_information',
                        'name' => 'Child information',
                        'order' => 1,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'child_information';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'child_information';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'health_information' =>
                    array(
                        'code' => 'health_information',
                        'name' => 'Health Information',
                        'order' => 4,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'health_information';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'health_information';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'cultural_background' =>
                    array(
                        'code' => 'cultural_background',
                        'name' => 'Cultural Background',
                        'order' => 2,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'cultural_background';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'cultural_background';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'additional_carer_details' =>
                    array(
                        'code' => 'additional_carer_details',
                        'name' => 'Parent 2/Additional Carer',
                        'order' => 6,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && isset($k['second_name']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'additional_carer_details';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'additional_carer_details';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
                'emergency_contact_details' =>
                    array(
                        'code' => 'emergency_contact_details',
                        'name' => 'Emergency Contact Details',
                        'order' => 7,
                        'inputs' =>
                            array_merge(
                                array_column(array_values(array_filter($defualtEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && (isset($elementSettings[$k['second_name']]) && $elementSettings[$k['second_name']]['hidden'] == 1) && $k['section'] === 'emergency_contact_details';
                                }, ARRAY_FILTER_USE_BOTH)), 'name'),
                                array_column(array_values(array_filter($newEnrolmentInputsOnly, function ($k) use ($elementSettings) {
                                    return isset($k['section']) && !isset($k['second_name']) && $k['section'] === 'emergency_contact_details';
                                }, ARRAY_FILTER_USE_BOTH)), 'name')
                            ),
                    ),
            );
        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }


    public static function enquiriesDefaultCollection($data)
    {
        /*enquiries*/
        try {
            return array(
                0 =>
                    array(
                        'name' => 'parentFirstname',
                        'order' => 1,
                        'types' => '',
                        'height' => '33',
                        'values' => isset($data['firstname']) ? $data['firstname'] : '',
                        'section' => '',
                        'question' => 'First name',
                        'required' => true,
                        'input_type' => 'textbox',
                        'placeholder' => 'First name',
                        'waitlist_section' => 'parent_guardian',
                    ),
                array(
                    'name' => 'parentlastname',
                    'order' => 2,
                    'types' => '',
                    'height' => '33',
                    'values' => isset($data['lastname']) ? $data['lastname'] : '',
                    'section' => '',
                    'question' => 'Middle name',
                    'required' => false,
                    'input_type' => 'textbox',
                    'placeholder' => 'Middle name',
                    'waitlist_section' => 'parent_guardian',
                ),
                array(
                    'name' => 'parentEmail',
                    'order' => 3,
                    'types' => '',
                    'height' => '33',
                    'values' => isset($data['email']) ? $data['email'] : '',
                    'section' => '',
                    'question' => 'Email',
                    'required' => true,
                    'input_type' => 'email',
                    'placeholder' => 'Email',
                    'waitlist_section' => 'parent_guardian',
                ),
                array(
                    'name' => 'parentMobile',
                    'order' => 4,
                    'types' => '',
                    'height' => '33',
                    'values' => isset($data['mobile']) ? $data['mobile'] : '',
                    'section' => '',
                    'question' => 'Mobile',
                    'required' => true,
                    'input_type' => 'textbox',
                    'placeholder' => 'Mobile',
                    'waitlist_section' => 'parent_guardian',
                ),
            );
        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }

    }

    public static function enquiryForDefaultCollection($newInputs, $org_id, $branch_id)
    {
        /*enquiry*/
        try {
            $enquiryInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return isset($k['enquiry_section']) && $k['enquiry_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));
            if (sizeof($enquiryInputsOnly) == 0) {
                $enquiryInputsOnly = array_values(array_filter($newInputs, function ($k) {
                    return isset($k['waitlist_section']) && $k['waitlist_section'] !== '';
                }, ARRAY_FILTER_USE_BOTH));
            }

            $questionTable = new WaitlistEnquiryQuestions();
            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            if ($branchTemplateElements->isEmpty()) {
                $branchElementEnrolment = $questionTable::with('section')->where('organization_id', '=', $org_id)->where('branch_id', '=', null)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
                if ($branchElementEnrolment->isEmpty()) {
                    $branchElementEnrolment = $questionTable::with('section')->where('organization_id', '=', null)->where('branch_id', '=', null)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
                }
            } else {
                $branchElementEnrolment = $questionTable::with('section')->where('organization_id', $org_id)->where('branch_id', $branch_id)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
            }

            if (!$branchElementEnrolment->isEmpty()) {
                foreach ($branchElementEnrolment->toArray() as $enq) {

                    $newCollection [] = array(
                        'waitlist_section' => '',
                        'enquiry_section' => $enq['section']['section_code'],
                        'values' => array_search($enq['input_name'], array_column($enquiryInputsOnly, 'name')) === false ? '' : $enquiryInputsOnly[array_search($enq['input_name'], array_column($enquiryInputsOnly, 'name'))]['values'],
                        'name' => $enq['input_name'],
                        'section' => '',
                        'input_type' => $enq['input_type'],
                        'question' => $enq['question'],
                        'placeholder' => $enq['input_placeholder'],
                        'required' => $enq['input_mandatory'] ? false : true,
                        'types' => $enq['types'],
                        'height' => $enq['column_height'],
                        'order' => $enq['column_order'],
                    );

                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['name'] = $enq['section']['section_name'];
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['code'] = $enq['section']['section_code'];
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['order'] = $enq['section']['section_order'];
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['inputs'][] = $enq['input_name'];
                }
            }
            return array('inputs' => $newCollection, 'enquiry' => $inputsForNewSections['enquiry']);

        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    public static function waitlistDefaultCollection($newInputs, $org_id, $branch_id)
    {
        /*waitlist*/
        try {
            $waitlistInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return isset($k['waitlist_section']) && $k['waitlist_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            $questionTable = new WaitlistQuestions();
            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            if ($branchTemplateElements->isEmpty()) {
                $branchElementEnrolment = $questionTable::with('section')->where('organization_id', '=', $org_id)->where('branch_id', '=', null)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
                if ($branchElementEnrolment->isEmpty()) {
                    $branchElementEnrolment = $questionTable::with('section')->where('organization_id', '=', null)->where('branch_id', '=', null)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
                }
            } else {
                $branchElementEnrolment = $questionTable::with('section')->where('organization_id', $org_id)->where('branch_id', $branch_id)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
            }

            if (!$branchElementEnrolment->isEmpty()) {
                foreach ($branchElementEnrolment->toArray() as $waits) {

                    $newCollection [] = array(
                        'waitlist_section' => $waits['section']['section_code'],
                        'values' => array_search($waits['input_name'], array_column($waitlistInputsOnly, 'name')) === false ? '' : $waitlistInputsOnly[array_search($waits['input_name'], array_column($waitlistInputsOnly, 'name'))]['values'],
                        'name' => $waits['input_name'],
                        'section' => '',
                        'input_type' => $waits['input_type'],
                        'question' => $waits['question'],
                        'placeholder' => $waits['input_placeholder'],
                        'required' => $waits['input_mandatory'] ? false : true,
                        'types' => $waits['types'],
                        'height' => $waits['column_height'],
                        'order' => $waits['column_order'],
                    );

                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['name'] = $waits['section']['section_name'];
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['code'] = $waits['section']['section_code'];
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['order'] = $waits['section']['section_order'];
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['inputs'][] = $waits['input_name'];
                }
            }
            return array('inputs' => $newCollection, 'waitlist' => $inputsForNewSections['waitlist']);

        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    public static function enrolmentDefaultCollection($newInputs, $org_id, $branch_id)
    {
        /*enrolment*/
        try {
            $enrolmentInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return isset($k['section']) && $k['section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            $questionTable = new WaitlistEnrolmentQuestions();
            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            if ($branchTemplateElements->isEmpty()) {
                $branchElementEnrolment = $questionTable::with('section')->where('organization_id', '=', $org_id)->where('branch_id', '=', null)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
                if ($branchElementEnrolment->isEmpty()) {
                    $branchElementEnrolment = $questionTable::with('section')->where('organization_id', '=', null)->where('branch_id', '=', null)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
                }
            } else {
                $branchElementEnrolment = $questionTable::with('section')->where('organization_id', $org_id)->where('branch_id', $branch_id)->where('hidden', '=', '1')->orderBy('column_order', 'ASC')->get();
            }

            if (!$branchElementEnrolment->isEmpty()) {
                foreach ($branchElementEnrolment->toArray() as $enrols) {

                    $newCollection [] = array(
                        'waitlist_section' => '',
                        'values' => array_search($enrols['input_name'], array_column($enrolmentInputsOnly, 'name')) === false ? '' : $enrolmentInputsOnly[array_search($enrols['input_name'], array_column($enrolmentInputsOnly, 'name'))]['values'],
                        'name' => $enrols['input_name'],
                        'section' => $enrols['section']['section_code'],
                        'input_type' => $enrols['input_type'],
                        'question' => $enrols['question'],
                        'placeholder' => $enrols['input_placeholder'],
                        'required' => $enrols['input_mandatory'] ? false : true,
                        'types' => $enrols['types'],
                        'height' => $enrols['column_height'],
                        'order' => $enrols['column_order'],
                    );

                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['name'] = $enrols['section']['section_name'];
                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['code'] = $enrols['section']['section_code'];
                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['order'] = $enrols['section']['section_order'];
                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['inputs'][] = $enrols['input_name'];
                }
            }
            return array('inputs' => $newCollection, 'enrolment' => $inputsForNewSections['enrolment']);

        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    public static function emrgencyContactData($data)
    {
        if (isset($data['emergencyContacts'][0]['ec_firstname'])) {
            foreach ($data['emergencyContacts'] as $key => $em) {
                $emergencyContact[$key]['emenrgencyEmail'] = $em['ec_email'] ?? '';
                $emergencyContact[$key]['emenrgencyPhone'] = $em['ec_phone'] ?? '';
                $emergencyContact[$key]['emenrgencyhomeAddress'] = $em['ec_address'] ?? '';
                $emergencyContact[$key]['emenrgencylastName'] = $em['ec_lastname'] ?? '';
                $emergencyContact[$key]['emenrgencyFirtsName'] = $em['ec_firstname'] ?? '';
                $emergencyContact[$key]['emenrgencyRelationship'] = $em['ec_relationship'] ?? '';

                $emergencyContact[$key]['emNomKioskApp'] = $em['emNomKioskApp'] ?? false;
                $emergencyContact[$key]['emNomTranspoSer'] = $em['emNomTranspoSer'] ?? false;
                $emergencyContact[$key]['emAdiAuthNominieeIncursion'] = $em['ec_consent_incursion'] ?? false;
                $emergencyContact[$key]['emAddiAuthNomiColect'] = $em['ec_consent_collect_child'] ?? false;
                $emergencyContact[$key]['emenrgencyContact'] = $em['ec_consent_emergency_contact'] ?? null;
                $emergencyContact[$key]['emeAddiAuthNomiColMedi'] = $em['ec_consent_make_medical_decision'] ?? false;
            }

        } else {
            $emergencyContact = $data['emergencyContacts'] ?? [];
        }
        return $emergencyContact ?? [];
    }

    public static function defaultSettings($data)
    {

        $emergencyContact = self::emrgencyContactData($data);

        return array(

            array(
                'name' => 'childProImage',
                'second_name' => 'childProImage',
                'order' => 0,
                'types' =>
                    array(
                        'multiple' => false,
                        'hyperlink' => NULL,
                        'useInWait' => false,
                        'useInEnrol' => false,
                        'EnrolForSection' => NULL,
                        'WaitlistForSection' => NULL,
                    ),
                'height' => '100',
                'values' => isset($data['childProImage']) ? $data['childProImage'] : '',
                'section' => 'child_information',
                'question' => 'Profile Image',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => NULL,
                'waitlist_section' => '',
            ),
            array(
                'name' => 'child_bornOrNot',
                'second_name' => 'child_bornOrNot',
                'order' => 0,
                'types' => '',
                'height' => '100',
                'values' => isset($data['child_bornOrNot']) ? !!$data['child_bornOrNot'] : false,
                'section' => '',
                'question' => 'Has your child been born yet?',
                'required' => true,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'addtionalFirstname',
                'second_name' => 'carer_firstname',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_firstname']) ? $data['carer_firstname'] : '',
                'section' => 'additional_carer_details',
                'question' => 'First name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'First name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent1',
                'second_name' => 'consent1',
                'order' => 1,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent1']) ? false : !!$data['consent1'],
                'section' => 'consents',
                'question' => 'Do you consent for the service to seek medical treatment for your child from a medical practitioner, hospital or ambulance in the event you cannot be contacted?',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencyFirtsName',
                'second_name' => 'ec_firstname',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['emenrgencyFirtsName']) ? $data['emenrgencyFirtsName'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'First Name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'First Name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'medicareNumber',
                'second_name' => 'child_medical_number',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_medical_number']) ? $data['child_medical_number'] : '',
                'section' => 'health_information',
                'question' => 'Child\'s Medicare Number/Reference No.',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Child\'s Medicare Number/Reference No.',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'startDate',
                'second_name' => 'enrollment_start_date',
                'order' => 1,
                'types' => '',
                'height' => '50',
                'values' => isset($data['enrollment_start_date']) ? $data['enrollment_start_date'] : '',
                'section' => 'booking_details',
                'question' => 'Expected Start Date',
                'required' => true,
                'input_type' => 'date-picker',
                'placeholder' => 'Select date',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'straitIslande',
                'second_name' => 'child_aboriginal',
                'order' => 1,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        0 => 'Aboriginal not TS Islander',
                                    ),
                                1 =>
                                    array(
                                        0 => 'TS Islander not Aboriginal',
                                    ),
                                2 =>
                                    array(
                                        0 => 'Aboriginal and TS Islander',
                                    ),
                                3 =>
                                    array(
                                        0 => 'Not Aboriginal nor TS Islander',
                                    ),
                                4 =>
                                    array(
                                        0 => 'Not stated',
                                    ),
                            ),
                    ),
                'height' => '100',
                'values' => isset($data['child_aboriginal']) ? $data['child_aboriginal'] : '',
                'section' => 'cultural_background',
                'question' => 'Are you of Aboriginal or Torres Strait Islander descent?',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Select one',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentFirstname',
                'second_name' => 'parent_firstname',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_firstname']) ? $data['parent_firstname'] : '',
                'section' => 'parent_guardian',
                'question' => 'First name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'First name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentFirstname',
                'second_name' => 'parent_firstname',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_firstname']) ? $data['parent_firstname'] : '',
                'section' => '',
                'question' => 'First name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'First name',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'firstname',
                'second_name' => 'child_firstname',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_firstname']) ? $data['child_firstname'] : '',
                'section' => 'child_information',
                'question' => 'First name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'First name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'firstname',
                'second_name' => 'child_firstname',
                'order' => 1,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_firstname']) ? $data['child_firstname'] : '',
                'section' => '',
                'question' => 'First name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'First name',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'addtionalmiddlename',
                'second_name' => 'carer_middlename',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_middlename']) ? $data['carer_middlename'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Middle name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Middle name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent2',
                'second_name' => 'consent2',
                'order' => 2,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent2']) ? false : !!$data['consent2'],
                'section' => 'consents',
                'question' => 'Do you consent for your child to be transported by an ambulance service?',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'culturalBackground',
                'second_name' => 'cultural_background',
                'order' => 2,
                'types' => '',
                'height' => '50',
                'values' => isset($data['cultural_background']) ? $data['cultural_background'] : '',
                'section' => 'cultural_background',
                'question' => 'What is your child\'s cultural background?',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'What is your child\'s cultural background?',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencylastName',
                'second_name' => 'ec_lastname',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['emenrgencylastName']) ? $data['emenrgencylastName'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'Last name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Last Name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'medicareExopiry',
                'second_name' => 'child_medicalexpiry_date',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_medicalexpiry_date']) ? $data['child_medicalexpiry_date'] : '',
                'section' => 'health_information',
                'question' => 'Child\'s Medicare Expiry Date',
                'required' => false,
                'input_type' => 'date-picker',
                'placeholder' => 'Select Date',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'middlename',
                'second_name' => 'child_middlename',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_middlename']) ? $data['child_middlename'] : '',
                'section' => 'child_information',
                'question' => 'Middle name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Middle name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentmiddlename',
                'second_name' => 'parent_middlename',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_middlename']) ? $data['parent_middlename'] : '',
                'section' => 'parent_guardian',
                'question' => 'Middle name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Middle name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'preferedDate',
                'second_name' => 'bookings',
                'order' => 2,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        'option' => 'mornings',
                                    ),
                                1 =>
                                    array(
                                        'option' => 'monday',
                                    ),
                                2 =>
                                    array(
                                        'option' => 'tuesday',
                                    ),
                                3 =>
                                    array(
                                        'option' => 'wednesday',
                                    ),
                                4 =>
                                    array(
                                        'option' => 'thursday',
                                    ),
                                5 =>
                                    array(
                                        'option' => 'friday',
                                    ),
                                6 =>
                                    array(
                                        'option' => 'saturday',
                                    ),
                                7 =>
                                    array(
                                        'option' => 'sunday',
                                    ),
                            ),
                        'checkbox' =>
                            array(),
                    ),
                'height' => '80',
                'values' => isset($data['bookings']) ? $data['bookings'] : '',
                'section' => 'booking_details',
                'question' => 'What are your preferred days of enrolment?',
                'required' => false,
                'input_type' => 'select-checkbox',
                'placeholder' => 'Select One',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'middlename',
                'second_name' => 'child_middlename',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_middlename']) ? $data['child_middlename'] : '',
                'section' => '',
                'question' => 'Middle name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Middle name',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'parentmiddlename',
                'second_name' => 'parent_middlename',
                'order' => 2,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_middlename']) ? $data['parent_middlename'] : '',
                'section' => '',
                'question' => 'Middle name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Middle name',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionallastname',
                'second_name' => 'carer_lastname',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_lastname']) ? $data['carer_lastname'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Last name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Last name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'ambulanceCover',
                'second_name' => 'ambulance_cover_no',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['ambulance_cover_no']) ? $data['ambulance_cover_no'] : '',
                'section' => 'health_information',
                'question' => 'Ambulance Cover Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Ambulance Cover Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent3',
                'second_name' => 'consent3',
                'order' => 3,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent3']) ? false : !!$data['consent3'],
                'section' => 'consents',
                'question' => 'I give permission for educators with current first aid to administer paracetamol in an emergency in the correct dosage for the age of my child. Administration of this medication will only be given in the event of a parent being un-contactable in consultation with the director or nominated supervisor.',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencyPhone',
                'second_name' => 'ec_phone',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['emenrgencyPhone']) ? $data['emenrgencyPhone'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'Mobile',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Mobile',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'spokenHome',
                'second_name' => 'spoken_language',
                'order' => 3,
                'types' => '',
                'height' => '50',
                'values' => isset($data['spoken_language']) ? $data['spoken_language'] : '',
                'section' => 'cultural_background',
                'question' => 'What language is spoken at home?',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'What language is spoken at home?',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'lastname',
                'second_name' => 'child_lastname',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_lastname']) ? $data['child_lastname'] : '',
                'section' => 'child_information',
                'question' => 'Last name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Last name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'lastname',
                'second_name' => 'child_lastname',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_lastname']) ? $data['child_lastname'] : '',
                'section' => '',
                'question' => 'Last name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Last name',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'parentlastname',
                'second_name' => 'parent_lastname',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_lastname']) ? $data['parent_lastname'] : '',
                'section' => 'parent_guardian',
                'question' => 'Last name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Last name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentlastname',
                'second_name' => 'parent_lastname',
                'order' => 3,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_lastname']) ? $data['parent_lastname'] : '',
                'section' => '',
                'question' => 'Last name',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Last name',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionaldateOfBirth',
                'second_name' => 'carer_dob',
                'order' => 4,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_dob']) ? $data['carer_dob'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Date of Birth',
                'required' => false,
                'input_type' => 'date-picker',
                'placeholder' => 'Select Date',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent4',
                'second_name' => 'consent4',
                'order' => 4,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent4']) ? false : !!$data['consent4'],
                'section' => 'consents',
                'question' => 'Do you consent for the service to apply sunscreen for your child before outdoor activities and excursions?',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'culturalRequirements',
                'second_name' => 'cultural_requirement',
                'order' => 4,
                'types' =>
                    array(
                        'inputs' =>
                            array(
                                0 =>
                                    array(
                                        'input_name' => 'cultuaral_requirements_switch',
                                        'placeholder' => 'Cultuaral Requirements',
                                    ),
                            ),
                    ),
                'height' => '50',
                'values' => isset($data['cultural_requirement']) ? $data['cultural_requirement'] : '',
                'section' => 'cultural_background',
                'question' => 'Does your child have any cultural requirements?',
                'required' => false,
                'input_type' => 'textbox-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'dateOfBirth',
                'second_name' => 'child_date_of_birth',
                'order' => 4,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_date_of_birth']) ? $data['child_date_of_birth'] : '',
                'section' => 'child_information',
                'question' => 'Date of Birth',
                'required' => true,
                'input_type' => 'date-picker',
                'placeholder' => 'Select Date',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencyhomeAddress',
                'second_name' => 'ec_address',
                'order' => 4,
                'types' => '',
                'height' => '70',
                'values' => isset($data['emenrgencyhomeAddress']) ? $data['emenrgencyhomeAddress'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'Home Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Home Address',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'healthCentre',
                'second_name' => 'child_heallth_center',
                'order' => 4,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_heallth_center']) ? $data['child_heallth_center'] : '',
                'section' => 'health_information',
                'question' => 'Maternal & Child Health Centre',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Maternal & Child Health Centre',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentdateOfBirth',
                'second_name' => 'parent_dob',
                'order' => 4,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_dob']) ? $data['parent_dob'] : '',
                'section' => 'parent_guardian',
                'question' => 'Date of Birth',
                'required' => false,
                'input_type' => 'date-picker',
                'placeholder' => 'Select Date',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'dateOfBirth',
                'second_name' => 'child_date_of_birth',
                'order' => 4,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_date_of_birth']) ? $data['child_date_of_birth'] : '',
                'section' => '',
                'question' => 'Date of Birth',
                'required' => true,
                'input_type' => 'date-picker',
                'placeholder' => 'Select Date',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'parentdateOfBirth',
                'second_name' => 'parent_dob',
                'order' => 4,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_dob']) ? $data['parent_dob'] : '',
                'section' => '',
                'question' => 'Date of Birth',
                'required' => false,
                'input_type' => 'date-picker',
                'placeholder' => 'Select Date',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'carerEmail',
                'second_name' => 'carer_email',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_email']) ? $data['carer_email'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Email',
                'required' => false,
                'input_type' => 'email',
                'placeholder' => 'Email',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent5',
                'second_name' => 'consent5',
                'order' => 5,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent5']) ? false : !!$data['consent5'],
                'section' => 'consents',
                'question' => 'Do you consent for the service to administer Ventolin or Epi-pen to your child in case of emergency?',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'crn',
                'second_name' => 'chil_crn',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['chil_crn']) ? $data['chil_crn'] : '',
                'section' => 'child_information',
                'question' => 'Child CRN',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Customer Reference Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencyEmail',
                'second_name' => 'ec_email',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['emenrgencyEmail']) ? $data['emenrgencyEmail'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'Email',
                'required' => false,
                'input_type' => 'email',
                'placeholder' => 'Email',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'medicalService',
                'second_name' => 'practitioner_name',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['practitioner_name']) ? $data['practitioner_name'] : '',
                'section' => 'health_information',
                'question' => 'Medical Personnel/Service Name',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Medical Personnel/Service Name',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'religiousRequirements',
                'second_name' => 'religious_requirements_chk',
                'order' => 5,
                'types' =>
                    array(
                        'inputs' =>
                            array(
                                0 =>
                                    array(
                                        'input_name' => 'religious_requirements_switch',
                                        'placeholder' => 'Religious Requirements',
                                    ),
                            ),
                    ),
                'height' => '50',
                'values' => isset($data['religious_requirements_chk']) ? $data['religious_requirements_chk'] : '',
                'section' => 'cultural_background',
                'question' => 'Does your child have any religious requirements?',
                'required' => false,
                'input_type' => 'textbox-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentEmail',
                'second_name' => 'email',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['email']) ? $data['email'] : '',
                'section' => 'parent_guardian',
                'question' => 'Email',
                'required' => true,
                'input_type' => 'email',
                'placeholder' => 'Email',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'crn',
                'second_name' => 'chil_crn',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['chil_crn']) ? $data['chil_crn'] : '',
                'section' => '',
                'question' => 'Child CRN',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Customer Reference Number',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'parentEmail',
                'second_name' => 'email',
                'order' => 5,
                'types' => '',
                'height' => '33',
                'values' => isset($data['email']) ? $data['email'] : '',
                'section' => '',
                'question' => 'Email',
                'required' => true,
                'input_type' => 'email',
                'placeholder' => 'Email',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'consent6',
                'second_name' => 'consent6',
                'order' => 6,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent6']) ? false : !!$data['consent6'],
                'section' => 'consents',
                'question' => 'I agree to accurately record the time of arrival and departure of my child from the service in accordance with the service requirements.',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencyRelationship',
                'second_name' => 'ec_relationship',
                'order' => 6,
                'types' => '',
                'height' => '33',
                'values' => isset($data['emenrgencyRelationship']) ? $data['emenrgencyRelationship'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'Relationship',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Relationship',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'medicalServicePhone',
                'second_name' => 'practitioner_phoneNo',
                'order' => 6,
                'types' => '',
                'height' => '33',
                'values' => isset($data['practitioner_phoneNo']) ? $data['practitioner_phoneNo'] : '',
                'section' => 'health_information',
                'question' => 'Medical Personnel/Service Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Medical Personnel/Service Phone Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentprimaryCarer',
                'second_name' => 'parent_crn',
                'order' => 6,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_crn']) ? $data['parent_crn'] : '',
                'section' => '',
                'question' => 'Parent CRN',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Customer Reference Number',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'startDate',
                'second_name' => 'enrollment_start_date',
                'order' => 6,
                'types' => '',
                'height' => '33',
                'values' => isset($data['enrollment_start_date']) ? $data['enrollment_start_date'] : '',
                'section' => '',
                'question' => 'Anticipated Start Date',
                'required' => false,
                'input_type' => 'date-picker',
                'placeholder' => 'Select date',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'addtionalAddress',
                'second_name' => 'carer_address',
                'order' => 7,
                'types' => '',
                'height' => '70',
                'values' => isset($data['carer_address']) ? $data['carer_address'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Street address, P.O box, C/O',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'childGender',
                'second_name' => 'child_gender',
                'order' => 7,
                'types' =>
                    array(
                        0 =>
                            array(
                                'alt' => 'male icon',
                                'name' => 'Male',
                                'image' => 'assets/icons/flat/ui_set/custom_icons/form/male.svg',
                                'value' => '0',
                            ),
                        1 =>
                            array(
                                'alt' => 'female icon',
                                'name' => 'Female',
                                'image' => 'assets/icons/flat/ui_set/custom_icons/form/femenine.svg',
                                'value' => '1',
                            ),
                    ),
                'height' => '33',
                'values' => isset($data['child_gender']) ? $data['child_gender'] : '',
                'section' => 'child_information',
                'question' => 'Gender',
                'required' => true,
                'input_type' => 'radio-group',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent7',
                'second_name' => 'consent7',
                'order' => 7,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent7']) ? false : !!$data['consent7'],
                'section' => 'consents',
                'question' => 'I give permission for educators and school teachers/principals to share information about my child in relation to their care and wellbeing.',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'medicalServiceAddress',
                'second_name' => 'practitioner_address',
                'order' => 7,
                'types' => '',
                'height' => '100',
                'values' => isset($data['practitioner_address']) ? $data['practitioner_address'] : '',
                'section' => 'health_information',
                'question' => 'Medical Personnel/Service Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Medical Personnel/Service Address',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'childGender',
                'second_name' => 'child_gender',
                'order' => 7,
                'types' =>
                    array(
                        0 =>
                            array(
                                'alt' => 'male icon',
                                'name' => 'Male',
                                'image' => 'assets/icons/flat/ui_set/custom_icons/form/male.svg',
                                'value' => '0',
                            ),
                        1 =>
                            array(
                                'alt' => 'female icon',
                                'name' => 'Female',
                                'image' => 'assets/icons/flat/ui_set/custom_icons/form/femenine.svg',
                                'value' => '1',
                            ),
                    ),
                'height' => '33',
                'values' => isset($data['child_gender']) ? $data['child_gender'] : '',
                'section' => '',
                'question' => 'Gender',
                'required' => true,
                'input_type' => 'radio-group',
                'placeholder' => '',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'addtionalSuburb',
                'second_name' => 'carer_suburb',
                'order' => 8,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_suburb']) ? $data['carer_suburb'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Suburb',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Suburb',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'consent8',
                'second_name' => 'consent8',
                'order' => 8,
                'types' => '',
                'height' => '100',
                'values' => !isset($data['consent8']) ? false : !!$data['consent8'],
                'section' => 'consents',
                'question' => 'I agree to notify the service when my child is to be collected by any person .',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'healthRecord',
                'second_name' => 'health_record_chk',
                'order' => 8,
                'types' => '',
                'height' => '80',
                'values' => isset($data['health_record_chk']) ? $data['health_record_chk'] : '',
                'section' => 'health_information',
                'question' => 'Does your child have a Health Record?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentAddress',
                'second_name' => 'parent_address',
                'order' => 8,
                'types' => '',
                'height' => '70',
                'values' => isset($data['parent_address']) ? $data['parent_address'] : '',
                'section' => 'parent_guardian',
                'question' => 'Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Street address, P.O box, C/O',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentAddress',
                'second_name' => 'parent_address',
                'order' => 8,
                'types' => '',
                'height' => '70',
                'values' => isset($data['parent_address']) ? $data['parent_address'] : '',
                'section' => '',
                'question' => 'Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Street address, P.O box, C/O',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'siblingAttend',
                'second_name' => 'sibilings',
                'order' => 8,
                'types' => '',
                'height' => '100',
                'values' => isset($data['sibilings']) ? $data['sibilings'] : '',
                'section' => 'child_information',
                'question' => 'Does this child have a sibling that attends or has previously attended this Centre?',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),
            array(
                'name' => 'siblingAttend',
                'second_name' => 'sibilings',
                'order' => 8,
                'types' => '',
                'height' => '100',
                'values' => isset($data['sibilings']) ? $data['sibilings'] : '',
                'section' => '',
                'question' => 'Does this child have a sibling that attends or has previously attended this Centre?',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => 'child_information',
            ),
            array(
                'name' => 'additionalCarerCountry',
                'second_name' => 'carer_country',
                'order' => 9,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_country']) ? $data['carer_country'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Country',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Country',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'childImmunised',
                'second_name' => 'immunised_chk',
                'order' => 9,
                'types' => '',
                'height' => '80',
                'values' => isset($data['immunised_chk']) ? $data['immunised_chk'] : '',
                'section' => 'health_information',
                'question' => 'Has your child been immunised?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emenrgencyContact',
                'second_name' => 'ec_consent_emergency_contact',
                'order' => 9,
                'types' => '',
                'height' => '100',
                'values' => isset($data['emenrgencyContact']) ? $data['emenrgencyContact'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'I consent to be an emergency contact.',
                'required' => false,
                'input_type' => 'checkbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentSuburb',
                'second_name' => 'parent_suburb',
                'order' => 9,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_suburb']) ? $data['parent_suburb'] : '',
                'section' => 'parent_guardian',
                'question' => 'Suburb',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Suburb',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentSuburb',
                'second_name' => 'parent_suburb',
                'order' => 9,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_suburb']) ? $data['parent_suburb'] : '',
                'section' => '',
                'question' => 'Suburb',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Suburb',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'priority',
                'second_name' => 'priority',
                'order' => 9,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        0 => 'Priority 1',
                                    ),
                                1 =>
                                    array(
                                        0 => 'Priority 2',
                                    ),
                                2 =>
                                    array(
                                        0 => 'Priority 3',
                                    ),
                            ),
                    ),
                'height' => '100',
                'values' => isset($data['priority']) ? $data['priority'] : '',
                'section' => '',
                'question' => 'Priority detail',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Select Priority',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'addtionalPC',
                'second_name' => 'carer_postalCode',
                'order' => 10,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_postalCode']) ? $data['carer_postalCode'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Postal Code',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Postal Code',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emAddiAuthNomiColect',
                'second_name' => 'ec_consent_collect_child',
                'order' => 10,
                'types' => '',
                'height' => '100',
                'values' => isset($data['emAddiAuthNomiColect']) ? $data['emAddiAuthNomiColect'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'I consent to be an authorised nominee to collect this child.',
                'required' => false,
                'input_type' => 'checkbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentCountry',
                'second_name' => 'parent_country',
                'order' => 10,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_country']) ? $data['parent_country'] : '',
                'section' => 'parent_guardian',
                'question' => 'Country',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Country',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentCountry',
                'second_name' => 'parent_country',
                'order' => 10,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_country']) ? $data['parent_country'] : '',
                'section' => '',
                'question' => 'Country',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Country',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'prescribedMedicine',
                'second_name' => 'prescribed_medicine_chk',
                'order' => 10,
                'types' => '',
                'height' => '80',
                'values' => isset($data['prescribed_medicine_chk']) ? $data['prescribed_medicine_chk'] : '',
                'section' => 'health_information',
                'question' => 'Is your child receiving regular prescribed medicine?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'attendance',
                'second_name' => 'attendance',
                'order' => 10,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        'option' => 'monday',
                                    ),
                                1 =>
                                    array(
                                        'option' => 'tuesday',
                                    ),
                                2 =>
                                    array(
                                        'option' => 'wednesday',
                                    ),
                                3 =>
                                    array(
                                        'option' => 'thursday',
                                    ),
                                4 =>
                                    array(
                                        'option' => 'friday',
                                    ),
                                5 =>
                                    array(
                                        'option' => 'saturday',
                                    ),
                                6 =>
                                    array(
                                        'option' => 'sunday',
                                    ),
                            ),
                        'checkbox' =>
                            array(),
                    ),
                'height' => '100',
                'values' => isset($data['attendance']) ? $data['attendance'] : '',
                'section' => '',
                'question' => 'Preferred days of care',
                'required' => false,
                'input_type' => 'select-checkbox',
                'placeholder' => 'Select One',
                'waitlist_section' => 'child_information',
            ),

            array(
                'name' => 'addAllergy',
                'second_name' => 'allergiesArray',
                'order' => 11,
                'types' => '',
                'height' => '100',
                'values' => isset($data['allergiesArray']) ? $data['allergiesArray'] : '',
                'section' => 'health_information',
                'question' => 'Add Allergy',
                'required' => false,
                'input_type' => 'textboxArray',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'addtionalState',
                'second_name' => 'carer_state',
                'order' => 11,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_state']) ? $data['carer_state'] : '',
                'section' => 'additional_carer_details',
                'question' => 'State',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'State',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'childAddress',
                'second_name' => 'child_address',
                'order' => 11,
                'types' => '',
                'height' => '100',
                'values' => isset($data['child_address']) ? $data['child_address'] : '',
                'section' => 'child_information',
                'question' => 'Child\'s Home Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),
            array(
                'name' => 'emeAddiAuthNomiColMedi',
                'second_name' => 'ec_consent_make_medical_decision',
                'order' => 11,
                'types' => '',
                'height' => '100',
                'values' => isset($data['emeAddiAuthNomiColMedi']) ? $data['emeAddiAuthNomiColMedi'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'I consent to be an authorised nominee to make medical decisions on behalf of this child.',
                'required' => false,
                'input_type' => 'checkbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),
            array(
                'name' => 'parentPC',
                'second_name' => 'parent_postalCode',
                'order' => 11,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_postalCode']) ? $data['parent_postalCode'] : '',
                'section' => 'parent_guardian',
                'question' => 'Postal Code',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Postal Code',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentPC',
                'second_name' => 'parent_postalCode',
                'order' => 11,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_postalCode']) ? $data['parent_postalCode'] : '',
                'section' => '',
                'question' => 'Postal Code',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Postal Code',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionalPhone',
                'second_name' => 'carer_phone',
                'order' => 12,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_phone']) ? $data['carer_phone'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Home Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Phone',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'anaphylaxis',
                'second_name' => 'anaphylaxis_chk',
                'order' => 12,
                'types' => '',
                'height' => '80',
                'values' => isset($data['anaphylaxis_chk']) ? $data['anaphylaxis_chk'] : '',
                'section' => 'health_information',
                'question' => 'Has your child be diagnosed or at risk of anaphylaxis?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'childSuburb',
                'second_name' => 'child_suburb',
                'order' => 12,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_suburb']) ? $data['child_suburb'] : '',
                'section' => 'child_information',
                'question' => 'Child\'s Suburb',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Child\'s Suburb',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'emAdiAuthNominieeIncursion',
                'second_name' => 'ec_consent_incursion',
                'order' => 12,
                'types' => '',
                'height' => '100',
                'values' => isset($data['emAdiAuthNominieeIncursion']) ? $data['emAdiAuthNominieeIncursion'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'I consent to be an authorised nominee for this child\'s incursions and excursions.',
                'required' => false,
                'input_type' => 'checkbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentState',
                'second_name' => 'parent_state',
                'order' => 12,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_state']) ? $data['parent_state'] : '',
                'section' => 'parent_guardian',
                'question' => 'State',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'State',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentState',
                'second_name' => 'parent_state',
                'order' => 12,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_state']) ? $data['parent_state'] : '',
                'section' => '',
                'question' => 'State',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'State',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionalMobile',
                'second_name' => 'carer_mobile',
                'order' => 13,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_mobile']) ? $data['carer_mobile'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Mobile',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Mobile',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'child_state',
                'second_name' => 'child_state',
                'order' => 13,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_state']) ? $data['child_state'] : '',
                'section' => 'child_information',
                'question' => 'Child\'s State',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Child\'s State',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'epipenOrAnipen',
                'second_name' => 'epipen_chk',
                'order' => 13,
                'types' => '',
                'height' => '80',
                'values' => isset($data['epipen_chk']) ? $data['epipen_chk'] : '',
                'section' => 'health_information',
                'question' => 'Does your child have an epipen or anipen?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentPhone',
                'second_name' => 'parent_phone',
                'order' => 13,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_phone']) ? $data['parent_phone'] : '',
                'section' => 'parent_guardian',
                'question' => 'Home Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Phone',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentPhone',
                'second_name' => 'parent_phone',
                'order' => 13,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_phone']) ? $data['parent_phone'] : '',
                'section' => '',
                'question' => 'Home Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Phone',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionalOccupation',
                'second_name' => 'carer_occupation',
                'order' => 14,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_occupation']) ? $data['carer_occupation'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Occupation',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Occupation',
                'waitlist_section' => '',
            ),
            array(
                'name' => 'childPostcode',
                'second_name' => 'child_postcode',
                'order' => 14,
                'types' => '',
                'height' => '33',
                'values' => isset($data['child_postcode']) ? $data['child_postcode'] : '',
                'section' => 'child_information',
                'question' => 'Child\'s Postcode',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Child\'s Postcode',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'childCircumstances',
                'second_name' => 'child_circumstances',
                'order' => 14,
                'types' => '',
                'height' => '100',
                'values' => isset($data['child_circumstances']) ? $data['child_circumstances'] : '',
                'section' => 'child_information',
                'question' => 'Child’s Special Circumstances',
                'required' => false,
                'input_type' => 'text-area',
                'placeholder' => 'Description',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'healthConditions',
                'second_name' => 'other_health_conditions_chk',
                'order' => 14,
                'types' => '',
                'height' => '80',
                'values' => isset($data['other_health_conditions_chk']) ? $data['other_health_conditions_chk'] : '',
                'section' => 'health_information',
                'question' => 'Does your child have any other health conditions?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentMobile',
                'second_name' => 'parent_mobile',
                'order' => 14,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_mobile']) ? $data['parent_mobile'] : '',
                'section' => 'parent_guardian',
                'question' => 'Mobile',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Mobile',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentWorkPN',
                'second_name' => 'parentWorkPN',
                'order' => 14,
                'types' => '',
                'height' => '33',
                'values' => (isset($data['parentWorkPN']) && !is_null($data['parentWorkPN'])) ? $data['parentWorkPN'] : ((isset($data['work_phone'])) ? $data['work_phone'] : ''),
                'section' => '',
                'question' => 'Work Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Phone',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionalWorkAddress',
                'second_name' => 'carer_work_address',
                'order' => 15,
                'types' => '',
                'height' => '70',
                'values' => isset($data['carer_work_address']) ? $data['carer_work_address'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Work Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Work Address',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'asthma',
                'second_name' => 'asthma_chk',
                'order' => 15,
                'types' => '',
                'height' => '80',
                'values' => isset($data['asthma_chk']) ? $data['asthma_chk'] : '',
                'section' => 'health_information',
                'question' => 'Does your child have asthma?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'nappyChange',
                'second_name' => 'nappyChange',
                'order' => 15,
                'types' => '',
                'height' => '50',
                'values' => isset($data['nappyChange']) ? $data['nappyChange'] : '',
                'section' => 'child_information',
                'question' => 'Nappy Change Required',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentOccupation',
                'second_name' => 'occupation',
                'order' => 15,
                'types' => '',
                'height' => '33',
                'values' => isset($data['occupation']) ? $data['occupation'] : '',
                'section' => 'parent_guardian',
                'question' => 'Occupation',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Occupation',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentWorkMob',
                'second_name' => 'parentWorkMob',
                'order' => 15,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parentWorkMob']) ? $data['parentWorkMob'] : '',
                'section' => '',
                'question' => 'Work Mobile Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Mobile',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionalWorkEmailAddress',
                'second_name' => 'carer_work_email',
                'order' => 16,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_work_email']) ? $data['carer_work_email'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Work Email',
                'required' => false,
                'input_type' => 'email',
                'placeholder' => 'Work Email',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'birthCertificate',
                'second_name' => 'birth_certificate',
                'order' => 16,
                'types' => '',
                'height' => '80',
                'values' => isset($data['birth_certificate']) ? $data['birth_certificate'] : '',
                'section' => 'health_information',
                'question' => 'Does your child have a birth certificate?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'bottleFeed',
                'second_name' => 'bottleFeed',
                'order' => 16,
                'types' => '',
                'height' => '50',
                'values' => isset($data['bottleFeed']) ? $data['bottleFeed'] : '',
                'section' => 'child_information',
                'question' => 'Bottle Feed Required',
                'required' => false,
                'input_type' => 'switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentWorkAddress',
                'second_name' => 'work_address',
                'order' => 16,
                'types' => '',
                'height' => '70',
                'values' => isset($data['work_address']) ? $data['work_address'] : '',
                'section' => 'parent_guardian',
                'question' => 'Work Address',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Work Address',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentMobile',
                'second_name' => 'parent_mobile',
                'order' => 16,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_mobile']) ? $data['parent_mobile'] : '',
                'section' => '',
                'question' => 'Mobile',
                'required' => true,
                'input_type' => 'textbox',
                'placeholder' => 'Mobile',
                'waitlist_section' => 'parent_guardian',
            ),

            array(
                'name' => 'addtionalWorkPN',
                'second_name' => 'carer_work_phone',
                'order' => 17,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_work_phone']) ? $data['carer_work_phone'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Work Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Work Phone Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'courtAppointed',
                'second_name' => 'courtorders_chk',
                'order' => 17,
                'types' => '',
                'height' => '100',
                'values' => isset($data['courtorders_chk']) ? $data['courtorders_chk'] : '',
                'section' => 'child_information',
                'question' => 'Are there any court appointed orders relating to this enrolment?',
                'required' => false,
                'input_type' => 'upload-switch',
                'placeholder' => '',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentWorkEmailAddress',
                'second_name' => 'work_email',
                'order' => 17,
                'types' => '',
                'height' => '33',
                'values' => isset($data['work_email']) ? $data['work_email'] : '',
                'section' => 'parent_guardian',
                'question' => 'Work Email',
                'required' => false,
                'input_type' => 'email',
                'placeholder' => 'Work Email',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentWorkPN',
                'second_name' => 'parentWorkPN',
                'order' => 18,
                'types' => '',
                'height' => '33',
                'values' => (isset($data['parentWorkPN']) && !is_null($data['parentWorkPN'])) ? $data['parentWorkPN'] : ((isset($data['work_phone'])) ? $data['work_phone'] : ''),
                'section' => 'parent_guardian',
                'question' => 'Work Phone Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Work Phone Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'addtionalWorkMN',
                'second_name' => 'carer_work_mob',
                'order' => 19,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_work_mob']) ? $data['carer_work_mob'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Work Mobile Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Work Mobile Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentWorkMob',
                'second_name' => 'parentWorkMob',
                'order' => 19,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parentWorkMob']) ? $data['parentWorkMob'] : '',
                'section' => 'parent_guardian',
                'question' => 'Work Mobile Number',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Work Mobile Number',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'addtionalStraitIslande',
                'second_name' => 'carer_aboriginal',
                'order' => 22,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        0 => 'Aboriginal not TS Islander',
                                    ),
                                1 =>
                                    array(
                                        0 => 'TS Islander not Aboriginal',
                                    ),
                                2 =>
                                    array(
                                        0 => 'Aboriginal and TS Islander',
                                    ),
                                3 =>
                                    array(
                                        0 => 'Not Aboriginal nor TS Islander',
                                    ),
                                4 =>
                                    array(
                                        0 => 'Not stated',
                                    ),
                            ),
                    ),
                'height' => '70',
                'values' => isset($data['carer_aboriginal']) ? $data['carer_aboriginal'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Are you of Aboriginal or Torres Strait Islander descent?',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Select one',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'addtionalCB',
                'second_name' => 'carer_cultural_background',
                'order' => 23,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_cultural_background']) ? $data['carer_cultural_background'] : '',
                'section' => 'additional_carer_details',
                'question' => 'What is your cultural background?',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Cultural background?',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentStraitIslande',
                'second_name' => 'parentStraitIslande',
                'order' => 23,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        0 => 'Aboriginal not TS Islander',
                                    ),
                                1 =>
                                    array(
                                        0 => 'TS Islander not Aboriginal',
                                    ),
                                2 =>
                                    array(
                                        0 => 'Aboriginal and TS Islander',
                                    ),
                                3 =>
                                    array(
                                        0 => 'Not Aboriginal nor TS Islander',
                                    ),
                                4 =>
                                    array(
                                        0 => 'Not stated',
                                    ),
                            ),
                    ),
                'height' => '66',
                'values' => isset($data['parentStraitIslande']) ? $data['parentStraitIslande'] : '',
                'section' => 'parent_guardian',
                'question' => 'Are you of Aboriginal or Torres Strait Islander descent?',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Select one',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'addtionalSH',
                'second_name' => 'carer_spoken_language',
                'order' => 24,
                'types' => '',
                'height' => '33',
                'values' => isset($data['carer_spoken_language']) ? $data['carer_spoken_language'] : '',
                'section' => 'additional_carer_details',
                'question' => 'What language is spoken at home?',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Language spoken at home',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentCB',
                'second_name' => 'parent_cultural_background',
                'order' => 24,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_cultural_background']) ? $data['parent_cultural_background'] : '',
                'section' => 'parent_guardian',
                'question' => 'What is your cultural background?',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Cultural background?',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'addtionalprimaryCarer',
                'second_name' => 'addition_carer_crn',
                'order' => 25,
                'types' => '',
                'height' => '33',
                'values' => isset($data['addition_carer_crn']) ? $data['addition_carer_crn'] : '',
                'section' => 'additional_carer_details',
                'question' => 'Additional Carer CRN',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Additional Carer CRN',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentSH',
                'second_name' => 'parent_spoken_language',
                'order' => 25,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_spoken_language']) ? $data['parent_spoken_language'] : '',
                'section' => 'parent_guardian',
                'question' => 'What language is spoken at home?',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Language spoken at home',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'parentprimaryCarer',
                'second_name' => 'parent_crn',
                'order' => 26,
                'types' => '',
                'height' => '33',
                'values' => isset($data['parent_crn']) ? $data['parent_crn'] : '',
                'section' => 'parent_guardian',
                'question' => 'Primary Carer CRN',
                'required' => false,
                'input_type' => 'textbox',
                'placeholder' => 'Primary Carer CRN',
                'waitlist_section' => '',
            ),

            array(
                'name' => 'hearAbout',
                'second_name' => 'hearAbout',
                'order' => 27,
                'types' =>
                    array(
                        'options' =>
                            array(
                                0 =>
                                    array(
                                        0 => 'Google',
                                    ),
                                1 =>
                                    array(
                                        0 => 'Friend or Relative',
                                    ),
                                2 =>
                                    array(
                                        0 => 'Word of Mouth',
                                    ),
                                3 =>
                                    array(
                                        0 => 'Facebook',
                                    ),
                                4 =>
                                    array(
                                        0 => 'MyWaitlist',
                                    ),
                                5 =>
                                    array(
                                        0 => 'CareForKids.com.au',
                                    ),
                                6 =>
                                    array(
                                        0 => 'Email',
                                    ),
                                7 =>
                                    array(
                                        0 => 'Employer',
                                    ),
                                8 =>
                                    array(
                                        0 => 'MyChild Website',
                                    ),
                                9 =>
                                    array(
                                        0 => 'Returning Family',
                                    ),
                                10 =>
                                    array(
                                        0 => 'Other',
                                    ),
                            ),
                    ),
                'height' => '100',
                'values' => isset($data['hearAbout']) ? $data['hearAbout'] : '',
                'section' => '',
                'question' => 'How did you hear about us?',
                'required' => false,
                'input_type' => 'select',
                'placeholder' => 'Please mention how did you hear about us',
                'waitlist_section' => 'parent_guardian',
            ),
            array(
                'name' => 'emNomKioskApp',
                'second_name' => 'emNomKioskApp',
                'order' => 8,
                'types' =>
                    array(
                        'fontBold' => true,
                    ),
                'height' => '100',
                'values' => isset($data['emNomKioskApp']) ? $data['emNomKioskApp'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'I consent to be an authorized nominee to drop off & pick up this child using Kiosk app.',
                'required' => false,
                'input_type' => 'checkbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),
            array(
                'name' => 'emNomTranspoSer',
                'second_name' => 'emNomTranspoSer',
                'order' => 13,
                'types' => '',
                'height' => '100',
                'values' => isset($data['emNomTranspoSer']) ? $data['emNomTranspoSer'] : '',
                'section' => 'emergency_contact_details',
                'question' => 'I consent to be an authorized nominee to authorize the child being transported by the service or on transportation arranged by the service',
                'required' => false,
                'input_type' => 'checkbox',
                'placeholder' => '',
                'waitlist_section' => '',
            ),
            array(
                'name' => 'addEmergencyContact',
                'second_name' => 'emergencyContacts',
                'order' => 14,
                'types' => '',
                'height' => '100',
                'values' => isset($emergencyContact) ? $emergencyContact : [],
                'section' => 'emergency_contact_details',
                'question' => 'Add Emergency Contact',
                'required' => false,
                'input_type' => 'textboxArray',
                'placeholder' => '',
                'waitlist_section' => '',
            ),
        );
    }

}
