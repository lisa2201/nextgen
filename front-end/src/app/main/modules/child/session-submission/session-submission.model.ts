import { User } from '../../user/user.model';
import * as _ from 'lodash';
import { Enrolment } from '../enrolment/models/enrolment.model';
import { SubmissionItem } from './dialogs/add-submission-report/add-submission-report.component';
import { Child } from '../child.model';

export class SessionSubmission {

    id: string;
    attrId: string;
    startDate: string;
    endDate: string;
    reportDate: string;
    type: string;
    status: string;
    statusLabel: string;
    processType: string;
    
    sessions: SubmissionItem[];
    enrolment?: Enrolment;
    creator?: User;
    child?: Child;
    syncStatus?: string;
    syncErrors?: any;
    statusHistory?: any;
    isCareProvided?: boolean;
    resubmittedOn?: string;
    isSessionProcessed?: boolean;

    isLoading?: boolean;
    showSubmittedSessions?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [session]
     * @param {number} [index]
     */
    constructor(session?: any, index?: number) 
    {
        this.id = session.id || '';
        this.attrId = session.attr_id || '';
        this.startDate = session.start || '';
        this.endDate = session.end || '';
        this.reportDate = session.report_date || '';
        this.type = session.type || null;
        this.status = session.status.code || '';
        this.statusLabel = session.status.label || '';
        this.processType = session.process_type || '';

        this.sessions = session.sessions || null;
        this.enrolment = (session.enrolment && !_.isNull(session.enrolment)) ? new Enrolment(session.enrolment) : null;
        this.child = (session.child && !_.isNull(session.child)) ? new Child(session.child) : null;
        this.creator = (session.creator && !_.isNull(session.creator)) ? new User(session.creator) : null;
        this.syncStatus = session.sync_status || '';
        this.syncErrors = session.sync_error || [];
        this.statusHistory = session.status_history || null;
        this.isCareProvided = session.no_care || false;
        this.resubmittedOn = session.resubmitted_on || null;
        this.isSessionProcessed = session.is_withdraw_processed || null;

        this.isLoading = false;
        this.showSubmittedSessions = false;
        this.index = index || 0;
    }

    /**
     * check id session has unknown error
     *
     * @returns {boolean}
     */
    hasError(): boolean
    {
        return this.syncStatus === '2';
    }

    /**
     * check id session is synced
     *
     * @returns {boolean}
     */
    isSynced(): boolean
    {
        return this.syncStatus === '1';
    }

    /**
     * check process was automated
     *
     * @returns {boolean}
     */
    isAutomatedProcess(): boolean
    {
        return this.processType === '0';
    }

    /**
     * check if session withdrawn
     *
     * @returns {boolean}
     */
    isWithdrawn(): boolean
    {
        return this.isSynced() && (this.status === 'PROCES' && this.isSessionProcessed);
    }

    /**
     * check if session api readable
     *
     * @returns {boolean}
     */
    canReadFromAPI(): boolean
    {
        return !this.isCompleted() && !this.hasError() && (!this.isWithdrawn() || this.status === 'WITHDR');
    }

    /**
     * check if session withdrawable
     *
     * @returns {boolean}
     */
    canWithDrawSession(): boolean
    {
        return this.isSynced() && this.status !== 'NONE' && this.status !== 'MANUAL' && this.status !== 'WITHDR';
    }

    /**
     * check if session can be deletable
     *
     * @returns {boolean}
     */
    canDeleteSession(): boolean
    {
        return this.hasError() || !this.isSynced();
    }

    /**
     * check if session can be submittable
     *
     * @returns {boolean}
     */
    canResubmit(): boolean
    {
        return (this.isWithdrawn() || this.hasError()) && !this.isResubmitted();
    }

    /**
     * check if session submission approved
     *
     * @returns {boolean}
     */
    isApproved(): boolean
    {
        return this.isSynced() && this.status === 'APPROV';
    }

    /**
     * check if session submission is completed
     *
     * @returns {boolean}
     */
    isCompleted(): boolean
    {
        return this.isSynced() && this.status === 'PROCES';
    }
    
    /**
     * check if session is resubmitted
     *
     * @returns {boolean}
     */
    isResubmitted(): boolean
    {
        return !_.isNull(this.resubmittedOn);
    }
    
    /**
     * get status image
     *
     * @returns {string}
     */
    getStatusImage(): string
    {
        let imageLink: string = 'assets/icons/flat/ui_set/custom_icons/document/file-processing.svg';

        switch (this.status) 
        {
            case 'PROCES':
                imageLink = 'assets/icons/flat/ui_set/custom_icons/document/file-done.svg';
                break;

            case 'WITHDR':
                imageLink = 'assets/icons/flat/ui_set/custom_icons/document/file-failed.svg';
                break;
        
            default:
                break;
        }

        if (this.hasError())
        {
            imageLink = 'assets/icons/flat/ui_set/custom_icons/document/file-error.svg';
        }

        return imageLink;
    }

    /**
     * get pre school program label
     *
     * @returns {string}
     */
    getPreSchoolStatus(value: string): string
    {
        let label = 'Not populated';

        switch (value) 
        {
            case 'Y':
                label = 'Yes';
                break;

            case 'N':
                label = 'No';
                break;
        
            default:
                break;
        }

        return label;
    }

}
