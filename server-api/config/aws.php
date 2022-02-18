<?php

return [
    'access_key' => env('AWS_ACCESS_KEY_ID'),
    'secret_key' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),

    // S3
    's3_access_key' => env('AWS_S3_ACCESS_KEY_ID'),
    's3_secret_key' => env('AWS_S3_SECRET_KEY_ID'),
    's3_prefix' => env('AWS_S3_URL_PREFIX'),

    //
    'gateway_api_key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',

    // SNS Topics
    'sns' => [
        // enrolment & submission
        'enrolment_submit' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Enrolment_Update_PROD',
        'session_report_submit' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Session_Report_PROD',
        'session_report_withdraw' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Session_Withdraw_PROD',
        'bulk_session_report_submit' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Session_Report_Batch_PROD',

        // ACCS
        'new_certificate' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_certificate_PROD',
        'update_state_territory' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Certificate_Update_Territory_Body_PROD',
        'update_certificate_documents' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Certificate_Update_documents_PROD',
        'update_certificate_state_territory_documents' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Certificate_Update_Territory_Document_PROD',
        'child_no_longer_at_risk' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_ChildNoLongerAtRisk_PROD',
        'certificate_cancel' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_certificate_cancel_PROD',
        'new_determination' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Determimation_PROD',

        // current gen connection (kinder connect)
        'kinder_connect_user' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-educator_PROD',
        'kinder_connect_room' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-room_PROD',
        'kinder_connect_child' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-child_PROD',
        'kinder_connect_attendance' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-attendance_PROD',

        'account_management' => [
            'provider_address_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Provider_Address_Update_PROD',
            'provider_name_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Provider_Name_Update_PROD',
            'service_address_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Service_Address_Update_PROD',
            'service_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Service_Update_PROD',
            'nextccs_create_provider_personnel' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Provider_Personnel_PROD',
            'nextccs_update_provider_personnel' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Update_Provider_Personnel_PROD',
            'nextccs_personnel_update_documents' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Personnel_Update_documents_PROD',

            'nextccs_create_service_personnel' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Service_Personnel_PROD',
            'nextccs_update_service_personnel' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Update_Service_Personnel_PROD'
        ],

        //Return Fee reduction
        'return_fee' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Return_Fee_Reduction_PROD',
        'cancle_return_fee' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Return_Fee_Reduction_Cancel_PROD',

        //Debt
        'alternative_payments' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Alternative_Payment_PROD',
        'alternative_payments_upload_doc' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Alternative_Payment_Doc_PROD',

        'care_provided_vacancy' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Care_Provided_Vacancy_PROD',
    ],

    // SNS Topics (development)
    'sns_dev' => [
        // enrolment & submission
        'enrolment_submit' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Enrolment_Update',
        'session_report_submit' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Session_Report',
        'session_report_withdraw' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Session_Withdraw',
        'bulk_session_report_submit' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Session_Report_Batch',

        // ACCS
        'new_certificate' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_certificate',
        'update_state_territory' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Certificate_Update_Territory_Body',
        'update_certificate_documents' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Certificate_Update_documents',
        'update_certificate_state_territory_documents' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Certificate_Update_Territory_Document',
        'child_no_longer_at_risk' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_ChildNoLongerAtRisk',
        'certificate_cancel' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_certificate_cancel',
        'new_determination' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Determimation',

        // current gen connection (kinder connect)
        'kinder_connect_user' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-educator',
        'kinder_connect_room' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-room',
        'kinder_connect_child' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-child',
        'kinder_connect_attendance' => 'arn:aws:sns:ap-southeast-2:727928824050:kinderpay-kinderconnect-attendance',

        'account_management' => [
            'provider_address_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Provider_Address_Update',
            'provider_name_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Provider_Name_Update',
            'service_address_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Service_Address_Update',
            'service_update' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Service_Update',
            'nextccs_create_provider_personnel' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Provider_Personnel',
            'nextccs_update_provider_personnel' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Update_Provider_Personnel',
            'nextccs_personnel_update_documents' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Personnel_Update_documents',

            'nextccs_create_service_personnel' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Service_Personnel',
            'nextccs_update_service_personnel' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Update_Service_Personnel'
        ],

        //Return Fee reduction
        'return_fee' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Return_Fee_Reduction',
        'cancle_return_fee' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Return_Fee_Reduction_Cancel',

        //Debt
        'alternative_payments' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Alternative_Payment',
        'alternative_payments_upload_doc' =>'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Create_Alternative_Payment_Doc',

        'care_provided_vacancy' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Care_Provided_Vacancy',
    ],

    // API gateways
    'end_points' => [
        //enrollment
        'enrolment' => [
            'read' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/enrolements',
            'read_entitlement' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/entitlement'
        ],

        //submission
        'session_submission' => [
            'read' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/sessionreport'
        ],

        //ACCS
        'certificate_by_child' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/certificate',
        'determination_by_child' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/determination',
        'account_management' => [
            'get_personnel_from_api' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/servicepersonnel?$ccsproviderid=',
            'get_provider' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/provider?&$expand=ProviderName,Address,Financial,Contact,CCSApproval',
            'add_provider' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/provider?&$expand=Address,ProviderName,Contact,Financial,Service',
            'add_provider_service' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/service?$expand=ServiceName,Contact,Financial,Address,ServiceName',
            'get_service' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/service?&$expand=ServiceName,Contact,Financial,Address,CCSApproval',
            'get_accs_percentage' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/accspercentage?$ccsproviderid=',
            'ping_ccms' => 'https://gws.dss.gov.au/childcare/ccms/diagnostic/json/ping'

        ],
        'session_reports' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/sessionreport',
        'entitlement' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/entitlement',
        'notifications' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/notifications',

        // ccms operation
        'query_remittance' => 'https://gws.dss.gov.au/childcare/ccms/remittance/json/queryremittance',
        'querypayments' => 'https://gws.dss.gov.au/childcare/ccms/remittance/json/querypayments',
        'ccms_operation' => [
            'get_messages' => 'https://gws.dss.gov.au/childcare/ccms/messages/json/retrievemessages',
            'getInnovativeSolutionCases' => 'https://gws.dss.gov.au/childcare/ccms/iscase/json/queryisinnovativesolutionscase',
            'getInnovativeSolutionCasesClaims' => 'https://gws.dss.gov.au/childcare/ccms/iscaseclaim/json/queryisinnovativesolutionscaseclaim',

        ],
        'payment_advise' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/paymentadvice',
        'session_subsidy' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/subsidy',

        // Return Fee Reduction
        'read_return_fee' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/returnfeereduction',

        // Debt
        'read_debt' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/debt',
        'read_alternative_payments' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/alternativepaymentarrangements',

        'ccs_operation' => [
            'store_ccs_setup' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/activatetoken',
            'get_message_list' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/notifications?',
            'get_correspondece_list' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/correspondenceslist?',
            'get_correspondece' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/prod/correspondenceslist/link?'
        ],
    ],

    // API gateways (development)
    'end_points_dev' => [
        //enrollment
        'enrolment' => [
            'read' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/enrolements',
            'read_entitlement' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/entitlement'
        ],

        //submission
        'session_submission' => [
            'read' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/sessionreport'
        ],

        //ACCS
        'certificate_by_child' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/certificate',
        'determination_by_child' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/determination',
        'account_management' => [
            'get_personnel_from_api' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/servicepersonnel?$ccsproviderid=',
            'get_provider' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/provider?&$expand=ProviderName,Address,Financial,Contact,CCSApproval',
            'add_provider' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/provider?&$expand=Address,ProviderName,Contact,Financial,Service',
            'add_provider_service' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/service?$expand=ServiceName,Contact,Financial,Address,ServiceName',
            'get_service' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/service?&$expand=ServiceName,Contact,Financial,Address,CCSApproval',
            'get_accs_percentage' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/accspercentage?$ccsproviderid=',
            'ping_ccms' => 'https://nst35-gws.dss.gov.au/childcare/ccms/diagnostic/json/ping',

        ],
        'session_reports' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/sessionreport',
        'entitlement' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/entitlement',
        'notifications' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/notifications',

        // ccms operation
        'query_remittance' => 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance',
        'querypayments' => 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/querypayments',
        'ccms_operation' => [
            'get_messages' => 'https://nst35-gws.dss.gov.au/childcare/ccms/messages/json/retrievemessages',
            'getInnovativeSolutionCases' => 'https://nst35-gws.dss.gov.au/childcare/ccms/iscase/json/queryisinnovativesolutionscase',
            'getInnovativeSolutionCasesClaims' => 'https://nst35-gws.dss.gov.au/childcare/ccms/iscaseclaim/json/queryisinnovativesolutionscaseclaim',

        ],
        'payment_advise' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/paymentadvice',
        'session_subsidy' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/subsidy',

        // Return Fee Reduction
        'read_return_fee' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/returnfeereduction',

        // Debt
        'read_debt' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/debt',
        'read_alternative_payments' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/alternativepaymentarrangements',

        'ccs_operation' => [
            'store_ccs_setup' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/activatetoken',
            'get_message_list' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/notifications?',
            'get_correspondece_list' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/correspondenceslist?',
            'get_correspondece' => 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/correspondenceslist/link?'
        ],
    ],

    // Lambda Functions
    'lambda' => [
        'bulk_operation_csv' => 'nextgen-CCS-bulkOperationCsv',
        'parent_statement' => 'nextgen-CCS-generateParentStatement',
        'parent_statement_forbes' => 'nextgen-CCS-generateParentStatement-forbes',
        'sync_parent_payment_status' => 'nextgen-CCS-dailyPaymentStatusCheck',
        'bpay_status_check' => 'nextgen-CCS-dailyBpayCheck',
        'nextgen_booking_transactions' => 'nextgen-CCS-bookingTransactions',
        'nextgen_term_transactions' => 'nextgen-CCS-parentPaymentTermTransactionGenerator',
        'past_booking_manager' => 'nextgen-CCS-pastBookingManager'
    ]

];
