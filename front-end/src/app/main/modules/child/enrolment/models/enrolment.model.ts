import * as _ from 'lodash';
import { User } from 'app/main/modules/user/user.model';
import { Child } from '../../child.model';
import { EnrolmentChangeLog } from './enrolment-change-log.model';
import { EnrolmentStatusHistory } from './enrolment-status-history.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

export class Enrolment {

    id: string;
    enrolId: string;

    child: Child;
    individual: User;

    status: string;
    statusLabel: string;
    enrolStart: string;
    arrangementType: string;
    arrangementTypeLabel: string;
    sessionType: string;
    sessionTypeLabel: string;
    peaReasonType: string;
    peaReasonTypeLabel: string;
    
    created: string;
    weekCycle?: string;
    enrolEnd?: string;
    lateSubmission?: string;
    arrangementTypeNote?: string;
    sessionTypeIS?: boolean;
    signingParty?: string;
    signingPartyFirstName?: string;
    signingPartyLastName?: string;
    isCaseDetails?: string;
    note?: string;
    parentApprovedStatus?: string;

    changeLog?: EnrolmentChangeLog[];
    statusHistory?: EnrolmentStatusHistory[];
    routines: any;
    initialRoutines: any;

    isApproved?: boolean;
    syncStatus?: string;
    syncErrors?: any;

    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [enrolment]
     * @param {number} [index]
     */
    constructor(enrolment?: any, index?: number)
    {
        this.id = enrolment.id || '';
        this.enrolId = enrolment.enrol_id || '';

        this.child = (enrolment.child && !_.isNull(enrolment.child)) ? new Child(enrolment.child) : null;
        this.individual = (enrolment.individual && !_.isNull(enrolment.individual)) ? new User(enrolment.individual) : null;

        this.status = enrolment.status.code || '';
        this.statusLabel = enrolment.status.label || '';
        this.enrolStart = enrolment.enrol_start || '';

        this.arrangementType = enrolment.arrangement ? enrolment.arrangement.code : '';
        this.arrangementTypeLabel = enrolment.arrangement ? enrolment.arrangement.label :'';

        this.peaReasonType = (enrolment.arrangement && enrolment.arrangement.pea_reason) ? enrolment.arrangement.pea_reason.code : '';
        this.peaReasonTypeLabel = (enrolment.arrangement && enrolment.arrangement.pea_reason) ? enrolment.arrangement.pea_reason.label : '';

        this.sessionType = enrolment.session ? enrolment.session.code : '';
        this.sessionTypeLabel = enrolment.session ? enrolment.session.label : '';
        this.routines = enrolment.session ? enrolment.session.routine : [];
        this.initialRoutines = enrolment.initial_session || [];

        this.created = enrolment.account_created || '';
        this.weekCycle = enrolment.week_cycle || null;
        this.enrolEnd = enrolment.enrol_end || '';
        this.lateSubmission = enrolment.late_submission || '';
        this.arrangementTypeNote = enrolment.arrangement_note || '';
        this.sessionTypeIS = enrolment.session_state || false;
        this.signingParty = enrolment.signing || '';
        this.signingPartyFirstName = enrolment.signing_first || '';
        this.signingPartyLastName = enrolment.signing_last || '';
        this.isCaseDetails = enrolment.case_details || '';
        this.note = enrolment.note || '';
        this.parentApprovedStatus = enrolment.parent_approved_status || '0';

        this.changeLog = (enrolment.change_log && !_.isNull(enrolment.change_log)) ? enrolment.change_log.map(i => new EnrolmentChangeLog(i)) : [];
        this.statusHistory = (enrolment.ccs_history && !_.isNull(enrolment.ccs_history)) ? enrolment.ccs_history.map(i => new EnrolmentStatusHistory(i)) : [];

        this.isApproved = enrolment.parent_approved || false;
        this.syncStatus = enrolment.sync_status || '';
        this.syncErrors = enrolment.sync_error || [];

        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.index = index || 0;
    }

    /**
     * check if enrolment confirmed
     *
     * @returns {boolean}
     */
    isEnrolmentConfirmed(): boolean
    {
        return _.toUpper(this.status) === 'CONFIR';
    }

    /**
     * check if enrolment ceased
     *
     * @returns {boolean}
     */
    isEnrolmentCeased(): boolean
    {
        return _.toUpper(this.status) === 'CEASED';
    }

    /**
     * check if re-enrolled
     *
     * @returns {boolean}
     */
    isEnrolmentReEnrolled(): boolean
    {
        return _.toUpper(this.status) === 'RE_ENROL';
    }

    /**
     * check if enrolment is not submitted
     *
     * @returns {boolean}
     */
    isEnrolmentNew(): boolean
    {
        return _.toUpper(this.status) === 'NONE';
    }

    /**
     * check if enrolment is pending
     *
     * @returns {boolean}
     */
    isPendingEnrolment(): boolean
    {
        return _.toUpper(this.status) === 'PENDIN';
    }

    /**
     * check if allowed to create new enrolment
     *
     * @returns {boolean}
     */
    enrolmentClosed(): boolean
    {
        return this.isEnrolmentCeased() || _.toUpper(this.status) === 'NOTAPP' || _.toUpper(this.status) === 'REJECT' || _.toUpper(this.status) === 'WITHDR';
    }

    /**
     * check if allowed to update submitted enrolment
     *
     * @returns {boolean}
     */
    isEnrolmentActive(): boolean
    {
        return this.hasEnrolmentId() && !this.isPendingEnrolment() && !this.enrolmentClosed() && !this.isEnrolmentReEnrolled();
    }

    /**
     * check if enrolment editable
     *
     * @returns {boolean}
     */
    isEnrolmentEditable(): boolean
    {
        return !this.isEnrolmentCeased() && _.toUpper(this.status) !== 'NOTAPP' && _.toUpper(this.status) !== 'REJECT' && _.toUpper(this.status) !== 'WITHDR';
    }

    /**
     * check if enrolment has been approved by parent
     * skip if signing parent is not parent
     * 
     * @returns {boolean}
     */
    isEnrolmentApproved(): boolean
    {
        return (this.signingParty === '0') ? this.parentApprovedStatus === '2' : true;
    }

    /**
     * check if enrolment submitted and waiting to Government status changes
     *
     * @returns {boolean}
     */
    pendingGovernmentApproval(): boolean
    {
        return this.isPendingEnrolment() && this.isApproved && !this.hasError();
    }

    /**
     * show parent approval status
     *
     * @returns {boolean}
     */
    showParentApproveStatus(): boolean
    {
        return this.arrangementType === 'CWA' && this.signingParty === '0';
    }

    /**
     * check id enrolment has unknown error
     *
     * @returns {boolean}
     */
    hasError(): boolean
    {
        return this.syncStatus === '2';
    }

    /**
     * check id enrolment is synced
     *
     * @returns {boolean}
     */
    isSynced(): boolean
    {
        return this.syncStatus === '1';
    }

    /**
     * check if enrolment id exists
     *
     * @returns {boolean}
     */
    hasEnrolmentId(): boolean
    {
        return this.enrolId !== '';
    }

    /**
     * get confirmed date time
     *
     * @returns {string}
     */
    getConfirmedDateTimeLabel(timeZone: string = 'UTC'): string
    {
        // try
        // {
        //     return (this.isEnrolmentConfirmed() && !_.isEmpty(this.statusHistory)) 
        //         ? `(${ DateTimeHelper.parseMomentTzDateTime(_.head(this.statusHistory).timeStamp, timeZone).date } ${DateTimeHelper.parseMomentTzDateTime(_.head(this.statusHistory).timeStamp, timeZone).time})` 
        //         : '';
        // }
        // catch(error)
        // {
        //     return '';
        // }

        return '';
    }
}
