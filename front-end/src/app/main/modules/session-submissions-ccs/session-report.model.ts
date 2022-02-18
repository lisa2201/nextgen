import * as _ from 'lodash';
import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';

export class SessionReport {

    // serviceID: string;
    enrolmentID: string;
    sessionReportStartDate: string;
    sessionReportEndDate: string;
    updatedDateTime: string;
    initialSubmittedDateTime: string;
    reasonForChange: string;
    reasonForLateChange: string;
    isNoCareProvided: string;
    feeReductionAmount: string;
    statuses: string;
    ChangeReasons: string;
    SessionOfCares: string;

    /**
     * Constructor
     *
     * @param {*} [sessionreport]
     * @param {number} [index]
     */
    constructor(sessionreport?: any, index?: number)
    {
        // this.serviceID = entitlement.serviceID || '';
        this.enrolmentID = sessionreport.enrolmentID || '';
        this.sessionReportStartDate = sessionreport.sessionReportStartDate || '';
        this.sessionReportEndDate = sessionreport.sessionReportEndDate || '';
        this.updatedDateTime = this.formatDateTimetoReadable(sessionreport.updatedDateTime) || '';
        this.initialSubmittedDateTime = this.formatDateTimetoReadable(sessionreport.initialSubmittedDateTime) || '';
        this.reasonForChange = sessionreport.reasonForChange || '';
        this.reasonForLateChange = sessionreport.reasonForLateChange || '';
        this.isNoCareProvided = sessionreport.isNoCareProvided || '';
        this.feeReductionAmount = sessionreport.feeReductionAmount || '';
        this.statuses = this.formatStatuses(sessionreport.statuses.results) || '';
        this.ChangeReasons = sessionreport.ChangeReasons.results || '';
        this.SessionOfCares = this.formatSessionOfCares(sessionreport.SessionOfCares.results) || '';
    }


    TimeTransform(value: number, type: string): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return '--:--';
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';

        return `${h}:${m} ${a}`;
    }


    formatStatuses(statuses: any): string
    {

        let statusstring = '';
        statuses.forEach(entry => {
            statusstring = statusstring  + '       ' + entry.time_stamp.substring(0,10)  + ' ' + entry.time_stamp.substring(11) + ' ' + entry.status;

        });
        return statusstring;
    }

    formatSessionOfCares(sessionOfCares: any): string
    {
        let sessionofCaresstring = '';
        sessionOfCares.forEach(entry => {
            sessionofCaresstring  = sessionofCaresstring   + '       ' + entry.date  + '/' + entry.startTime + ' to ' + entry.endTime + ' Fee:' + entry.amountCharged;
        });
        return sessionofCaresstring ;
    }

    formatDateTimetoReadable(datetime: any): string
    {
        return datetime.substring(0,10) + ' at ' + datetime.substring(11);
    }
}
