export class EnrolmentStatusHistory
{
    status: string;
    statusText: string;
    timeStamp: string;
    reason: string;

    /**
     * Constructor
     */
    constructor(enrolmentHistory?: any)
    {
        this.status = enrolmentHistory.status || '';
        this.statusText = enrolmentHistory.status_text || '';
        this.timeStamp = enrolmentHistory.time_stamp || '';
        this.reason = enrolmentHistory.reason || '';
    }
}