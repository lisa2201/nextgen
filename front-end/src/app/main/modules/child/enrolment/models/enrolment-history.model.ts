export class EnrolmentHistory {

    serviceId: string;
    enrolmentId: string;
    status: string;
    noticeType: string;

    recordEffectiveStartDate: string;
    recordEffectiveEndDate: string;
    createdDateTime: string;
    lastUpdatedDateTime: string;
    
    isLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [history]
     * @param {number} [index]
     */
    constructor(history?: any, index?: number)
    {
        this.serviceId = history.service_id || '';
        this.enrolmentId = history.enrolment_id || '';
        this.status = history.status || '';
        this.noticeType = history.notice_type || '';

        this.recordEffectiveStartDate = history.record_effective_start_date || '';
        this.recordEffectiveEndDate = history.record_effective_end_date || '';
        this.createdDateTime = history.created_date_time || '';
        this.lastUpdatedDateTime = history.last_updated_date_time || '';
        
        this.isLoading = false;
        this.index = index || 0;
    }

}
