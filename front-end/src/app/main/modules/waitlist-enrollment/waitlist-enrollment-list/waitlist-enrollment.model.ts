import * as _ from "lodash";

export class WaitlistEnrollment {
    id?: string;
    waitlist_info?: any
    status?: string
    branch_id?: any
    branch_name?: string
    org_id?: any
    application_date: any;
    submitted_date: any;
    waitlist_sections: any; /* waitlist sections with ordered inputs  */
    enrolment_sections: any; /* enrolment settings with ordered inputs   */
    enquiry_sections: any; /* enrolment settings with ordered inputs   */
    all_inputs: any; /* waitlist settings */
    /**
     * Constructor
     *
     * @param waitlist
     */
    // tslint:disable-next-line: no-shadowed-variable
    constructor(waitlistData?: any, index?: number) {
        this.id = waitlistData.id || '';
        this.branch_id = waitlistData.branch_id || '';
        this.branch_name = waitlistData.branch_name || '';
        this.org_id = waitlistData.org_id || '';
        this.waitlist_info = waitlistData.waitlist_info || '';
        this.status = waitlistData.status || '';
        this.application_date = waitlistData.application_date || 0;
        this.submitted_date = waitlistData.submitted_date || '';
        this.waitlist_sections = waitlistData.waitlist_info?.section_inputs?.waitlist ? _.sortBy(waitlistData.waitlist_info.section_inputs.waitlist, 'order') : null;
        this.enrolment_sections = waitlistData.waitlist_info?.section_inputs?.enrolment ? _.sortBy(waitlistData.waitlist_info.section_inputs.enrolment, 'order') : null;
        this.enquiry_sections = waitlistData.waitlist_info?.section_inputs?.enquiry ? _.sortBy(waitlistData.waitlist_info.section_inputs.enquiry, 'order') : null;
        this.all_inputs = waitlistData.waitlist_info?.new_inputs ? waitlistData.waitlist_info.new_inputs : null;

    }

}
