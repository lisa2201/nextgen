export class EnrolmentChangeLog
{
    status: string;
    statusText: string;
    reason: string;
    timeStamp: string;
    description: string;

    /**
     * Constructor
     */
    constructor(enrolmentChangeLog?: any)
    {
        this.status = enrolmentChangeLog.status || '';
        this.statusText = enrolmentChangeLog.status_text || '';
        this.reason = enrolmentChangeLog.reason || '';
        this.timeStamp = enrolmentChangeLog.time_stamp || '';
        this.description = enrolmentChangeLog.description || '';
    }
}
