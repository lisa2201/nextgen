import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { takeUntil, finalize, distinctUntilChanged, skip, startWith } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';
import * as isEqual from 'fast-deep-equal';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';
import { NzModalService, NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ChildEnrolmentService } from './services/enrolment.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { ChildrenService } from '../services/children.service';
import { AuthService } from 'app/shared/service/auth.service';
import { ChildBookingService } from '../booking/services/booking.service';

import { Child } from '../child.model';
import { Booking } from '../booking/booking.model';
import { Enrolment } from './models/enrolment.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { browserRefresh } from 'app/app.component';
import { AppConst } from 'app/shared/AppConst';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

import { ChildSetCRNComponent } from './modals/set-crn/set-crn.component';
import { ChildSetEnrolmentSessionComponent } from './modals/set-enrolment-session/set-enrolment-session.component';
import { ChildEndEnrolmentComponent } from './modals/end-enrolment/end-enrolment.component';
export interface SessionRoutine {
    id: string;
    date: Date;
    day: string;
    cycleWeek: number;
    sessions: SessionRoutineItem[];
}
export interface SessionValue {
    start: number;
    end: number;
}
export interface SessionRoutineItem {
    cycleWeekNumber: number;
    sessionType: string;
    sessionDay: string;
    startTime: string;
    endTime: string;
    standardAmount: string;
    sessionUnitOfMeasure: string;

    date: string;
    fee: string;
    session: SessionValue;
    addedManually: boolean;
}
@Component({
    selector: 'child-enrolment',
    templateUrl: './enrolment.component.html',
    styleUrls: ['./enrolment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildEnrolmentComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    enrolment: Enrolment;
    fees: Fee[];
    booking: Booking[];
    client: AuthClient;
    arrangementTypes: object;
    reasonForPea: object;

    formTitle: string;
    childEnrolmentForm: FormGroup;
    buttonLoader: boolean;
    buttonLoaderSubmit: boolean;
    canEndDateOpen: boolean;
    current: number;
    weekDays: any;
    hideWeekEnd: boolean;

    sessionViewLoading: boolean;
    sessionRoutines: SessionRoutine[];

    setCRNModal: NzModalRef;
    setSessionModal: NzModalRef;
    endEnrolmentModal: NzModalRef;
    confirmModal: NzModalRef;

    viewLateSubmissionReason: boolean;
    hasBookingUpdate: any;
    loadingView: boolean;
    entitlement: any;

    tabViewItem: number | null;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildEnrolmentService} _childEnrolmentService
     * @param {CommonService} _commonService
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     * @param {ChildrenService} _childrenServices
     * @param {AuthService} _authService
     * @param {ChildBookingService} _bookingService
     * @param {Location} _location
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _childEnrolmentService: ChildEnrolmentService,
        private _commonService: CommonService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _childrenServices: ChildrenService,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
        private _location: Location
    )
    {
        // set default values
        this.child = null;
        this.enrolment = null;
        this.fees = [];
        this.booking = [];
        this.client = this._authService.getClient();
        this.arrangementTypes = {};
        this.reasonForPea = {};

        this.buttonLoader = false;
        this.buttonLoaderSubmit = false;
        this.canEndDateOpen = false;
        this.current = 0;
        this.weekDays = this._commonService.getWeekDays({
            hideWeekEnd: false,
            weekStartsAt: 1
        });
        this.hideWeekEnd = this._bookingService.calenderSettings.hideWeekEnd;
        this.formTitle = 'New Enrolment';

        this.sessionViewLoading = false;
        this.sessionRoutines = [];

        this.viewLateSubmissionReason = false;
        this.hasBookingUpdate = false;

        this.tabViewItem = null;

        this.childEnrolmentForm = this.createEnrolmentForm();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child enrolment !!');

        // Subscribe to child changes
        this._childEnrolmentService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) =>
            {
                this._logger.debug('[child]', child);

                this.child = child;

                if (browserRefresh)
                {
                    this._childrenServices.setDefaultCurrentChild(this.child);
                }

                this.childEnrolmentForm.get('child_crn').patchValue(this.child.CRN, { emitEvent: false });
            });

        // Subscribe to child enrolment changes
        this._childEnrolmentService
            .onChildEnrolmentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((enrolment: any) =>
            {
                this._logger.debug('[child enrolment]', enrolment);

                this.enrolment = enrolment;

                if (!_.isNull(this.enrolment))
                {
                    this.formTitle = 'Edit Enrolment';

                    this.setEnrolmentFormValues();
                }
            });

        // Subscribe to user dependency changes
        this._childEnrolmentService
            .onEnrolmentDependencyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[child enrolment dependency]', response);

                this.fees = response.fees;
                this.arrangementTypes = response.arrangement_types;
                this.reasonForPea = response.reason_for_pea;
            });

        // Subscribe to booking update changes
        this._childEnrolmentService
            .onEnrolmentBookingUpdateFound
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[child enrolment booking update found]', response);

                this.hasBookingUpdate = response;
            });

        // Subscribe to tab loader changes
        this._childEnrolmentService
            .onEnrolmentTabViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: number) => this.tabViewItem = value);

        // Subscribe to form value changes
        this.childEnrolmentForm
            .get('arrangement_type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.validateArrangementType(value));

        /*this.childEnrolmentForm
            .get('enrollment_start')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                if (_.isNull(value))
                {
                    this.childEnrolmentForm.get('session_type').patchValue(null, { emitEvent: false });

                    this.childEnrolmentForm.get('session_routine_type').patchValue(null, { emitEvent: false });

                    // reset
                    this.sessionRoutines = [];
                }
                else
                {
                    if (!_.isNull(this.fc.session_type.value) && !_.isNull(this.fc.session_routine_type.value))
                    {
                        this.getEnrolmentBookings();
                    }

                    // reset
                    if (this.enrolment)
                    {
                        this.hasBookingUpdate = false;
                    }
                }

                // this.validateLateSubmission(value);
            });*/

        this.childEnrolmentForm
            .get('session_type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.validateSessionType(value));

        this.childEnrolmentForm
            .get('session_routine_type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.buildSessionView());

        this.childEnrolmentForm
            .get('casual_fee')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.updateSessionHours(value));

        this.childEnrolmentForm
            .get('signing_party')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() =>
            {
                this.childEnrolmentForm.get('signing_party_first_name').updateValueAndValidity();
                this.childEnrolmentForm.get('signing_party_last_name').updateValueAndValidity();

                setTimeout(() => this.updateScroll(), 50);
            });

        this.childEnrolmentForm
            .get('individual')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this.childEnrolmentForm
                    .get('individual_crn')
                    .patchValue(value ? (this.child.parents.find(i => i.id === value) ? this.child.parents.find(i => i.id === value).ccsId : '') : '', { emitEvent: false });
            });

        this.childEnrolmentForm
            .get('calendarWeek')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                startWith(this.fc.calendarWeek.value),
                distinctUntilChanged(),
                skip(1)
            )
            .subscribe(value =>
            {
                if (_.isNull(value))
                {
                    return;
                }

                this.getEnrolmentBookings();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // reset child service
        if (this._router.routerState.snapshot.url.indexOf('/manage-children') < 0)
        {
            this._childrenServices.unsubscribeOptions();
        }

        if (this.confirmModal)
        {
            this.confirmModal.close();
        }

        if (this.setCRNModal)
        {
            this.setCRNModal.close();
        }

        if (this.setSessionModal)
        {
            this.setSessionModal.close();
        }

        if (this.endEnrolmentModal)
        {
            this.endEnrolmentModal.close();
        }
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * update page scroll
     */
    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /**
     * tab navigation previous
     */
    pre(): void
    {
        this.current -= 1;
    }

    /**
     * tab navigation new
     */
    next(): void
    {
        this.current += 1;
    }

    /**
     * update tab navigation position
     */
    updatePosition(index: number): void
    {
        this.current = index;
    }

    /**
     * get day of week
     *
     * @param {number} value
     * @returns {*}
     */
    getDay(value: number): any
    {
        return this._commonService.getWeekDays().find(i => i['index'] === +value)['name'];
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.childEnrolmentForm.controls;
    }

    /**
     * returns true if control has the validator
     *
     * @param {string} control
     * @param {string} validator
     * @returns {boolean}
     */
    hasValidator(control: string, validator: string): boolean
    {
        if (_.isNull(this.childEnrolmentForm.get(control).validator))
        {
            return false;
        }

        const formControl = this.childEnrolmentForm.get(control).validator({} as AbstractControl);

        return formControl && formControl.hasOwnProperty(validator);
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createEnrolmentForm(): FormGroup
    {
        return new FormGroup({
            ccs_id: new FormControl(''),
            child_crn: new FormControl(''),
            individual_crn: new FormControl(''),
            enrollment_start: new FormControl('', [Validators.required]),
            enrollment_end: new FormControl(''),
            individual: new FormControl(null, [Validators.required]),
            late_submission: new FormControl('', [Validators.maxLength(1000)]),
            arrangement_type: new FormControl('CWA', [Validators.required]),
            arrangement_type_note: new FormControl('', [Validators.maxLength(50)]),
            session_type: new FormControl('', [Validators.required]),
            session_is_case: new FormControl(false),
            signing_party: new FormControl('0', [Validators.required]),
            signing_party_first_name: new FormControl('', [Validators.maxLength(40), this.signingPartyRequiredValidator]),
            signing_party_last_name: new FormControl('', [Validators.maxLength(40), this.signingPartyRequiredValidator]),
            is_case_details: new FormControl(''),
            notes: new FormControl(''),
            casual_fee: new FormControl(null),
            casual_description: new FormControl(''),
            casual_hours: new FormControl(''),
            session_routine_type: new FormControl(null),
            calendarWeek: new FormControl(null),
            reason_for_pea: new FormControl(null)
        });
    }

    /**
     * set form values
     */
    setEnrolmentFormValues(): void
    {
        this.childEnrolmentForm.get('ccs_id').patchValue(this.enrolment.enrolId, { emitEvent: false });
        this.childEnrolmentForm.get('individual').patchValue(this.enrolment.individual ? (this.child.parents.filter(i => i.id === this.enrolment.individual.id).length > 0 ? this.enrolment.individual.id : null) : null, { emitEvent: false });
        this.childEnrolmentForm.get('individual_crn').patchValue(this.enrolment.individual ? this.enrolment.individual.ccsId : null, { emitEvent: false });
        this.childEnrolmentForm.get('enrollment_start').patchValue(DateTimeHelper.parseMomentDate(this.enrolment.enrolStart), { emitEvent: false });
        this.childEnrolmentForm.get('enrollment_end').patchValue(DateTimeHelper.parseMomentDate(this.enrolment.enrolEnd), { emitEvent: false });
        this.childEnrolmentForm.get('late_submission').patchValue(this.enrolment.lateSubmission, { emitEvent: false });
        this.childEnrolmentForm.get('arrangement_type').patchValue(this.enrolment.arrangementType, { emitEvent: false });
        this.childEnrolmentForm.get('arrangement_type_note').patchValue(this.enrolment.arrangementTypeNote, { emitEvent: false });
        this.childEnrolmentForm.get('session_type').patchValue(this.enrolment.sessionType, { emitEvent: false });
        this.childEnrolmentForm.get('session_is_case').patchValue(this.enrolment.sessionTypeIS, { emitEvent: false });
        this.childEnrolmentForm.get('signing_party').patchValue(this.enrolment.signingParty, { emitEvent: false });
        this.childEnrolmentForm.get('signing_party_first_name').patchValue(this.enrolment.signingPartyFirstName, { emitEvent: false });
        this.childEnrolmentForm.get('signing_party_last_name').patchValue(this.enrolment.signingPartyLastName, { emitEvent: false });
        this.childEnrolmentForm.get('is_case_details').patchValue(this.enrolment.isCaseDetails, { emitEvent: false });
        this.childEnrolmentForm.get('notes').patchValue(this.enrolment.note, { emitEvent: false });
        this.childEnrolmentForm.get('reason_for_pea').patchValue(this.enrolment.peaReasonType !== 'NONE' ? this.enrolment.peaReasonType : null, { emitEvent: false });

        if (this.enrolment.sessionType === 'R' || this.enrolment.sessionType === 'B' && !_.isNull(this.enrolment.weekCycle))
        {
            this.childEnrolmentForm.get('session_routine_type').patchValue((+this.enrolment.weekCycle === 1) ? '0' : '1', { emitEvent: false });

            // set session slots
            this.buildSessionView();
            // this.generateEditSessionView();
        }

        if (this.enrolment.sessionType === 'C' || this.enrolment.sessionType === 'B' && !_.isNull(this.enrolment.routines.casual))
        {
            this.childEnrolmentForm.get('casual_fee').patchValue(this.enrolment.routines.casual.fee, { emitEvent: false });
            this.childEnrolmentForm.get('casual_hours').patchValue(this.enrolment.routines.casual.hoursInCasualSession, { emitEvent: false });
            this.childEnrolmentForm.get('casual_description').patchValue(this.enrolment.routines.casual.casualSessionDescription, { emitEvent: false });

            // set validators
            this.setCausalValidators();
        }

        this.validateArrangementType(this.fc.arrangement_type.value);
    }

    /**
     * set signing party required validation
     *
     * @param {AbstractControl} formControl
     * @returns {*}
     */
    signingPartyRequiredValidator(formControl: AbstractControl): any
    {
        if (!formControl.parent)
        {
            return null;
        }

        if (formControl.parent.get('signing_party').value === '1')
        {
            return Validators.required(formControl);
        }

        return null;
    }

    /**
     * disable future dates
     */
    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    /**
     * validate start date
     */
    disabledStartDate = (startValue: Date): boolean =>
    {
        if (!startValue || !this.fc.enrollment_start.value)
        {
            return false;
        }

        return startValue.getTime() > this.fc.enrollment_start.value.getTime();
    }

    /**
     * validate end date
     */
    disabledEndDate = (endValue: Date): boolean =>
    {
        if (!endValue || !this.fc.enrollment_start.value)
        {
            return false;
        }

        return endValue.getTime() <= this.fc.enrollment_start.value.getTime();
    }

    /**
     * validate end date visibility
     *
     * @param {*} event
     */
    checkEndDateVisibility(event: any): void
    {
        this.canEndDateOpen = !_.isNull(event);

        if (_.isNull(event))
        {
            this.fc.enrollment_end.patchValue(null, { emitEvent: false });
            this.fc.enrollment_end.reset();
        }
    }

    /**
     * validate session type visibility
     *
     * @returns {boolean}
     */
    checkSessionTypeVisibility(): boolean
    {
        return (this.fc.enrollment_start.value === '' || _.isNull(this.fc.enrollment_start.value));
    }

    /**
     * validate against arrangement type
     *
     * @param {string} value
     */
    validateArrangementType(value: string): void
    {
        // reset
        this.childEnrolmentForm.get('individual').enable({ emitEvent: false });
        this.childEnrolmentForm.get('individual_crn').enable({ emitEvent: false });
        this.childEnrolmentForm.get('enrollment_end').enable({ emitEvent: false });

        this.childEnrolmentForm.get('signing_party').enable({ emitEvent: false });
        this.childEnrolmentForm.get('signing_party_first_name').enable({ emitEvent: false });
        this.childEnrolmentForm.get('signing_party_last_name').enable({ emitEvent: false });
        
        this.childEnrolmentForm.get('individual').patchValue((value === 'CWA' && !_.isNull(this.enrolment) && !_.isNull(this.enrolment.individual)) ? (this.child.parents.filter(i => i.id === this.enrolment.individual.id).length > 0 ? this.enrolment.individual.id : null) : null, { emitEvent: false });
        this.childEnrolmentForm.get('signing_party').patchValue((_.indexOf([ 'CWA', 'RA' ], value) > -1 && !_.isNull(this.enrolment)) ? this.enrolment.signingParty : '0', { emitEvent: false });
        this.childEnrolmentForm.get('arrangement_type_note').patchValue((value === 'RA' && !_.isNull(this.enrolment)) ? this.enrolment.arrangementTypeNote : '', { emitEvent: false });
        this.childEnrolmentForm.get('reason_for_pea').patchValue((value === 'PEA' && !_.isNull(this.enrolment) && this.enrolment.peaReasonType !== 'NONE') ? this.enrolment.peaReasonType : null, { emitEvent: false });

        setTimeout(() =>
        {
            if (value === 'RA' || value === 'ACCS' || value === 'PEA' || value === 'OA')
            {
                this.childEnrolmentForm.get('individual').patchValue(null, { emitEvent: false });
                this.childEnrolmentForm.get('individual').reset();
                this.childEnrolmentForm.get('individual').disable({ emitEvent: false });
                this.childEnrolmentForm.get('individual_crn').disable({ emitEvent: false });
            }

            if (value === 'ACCS')
            {
                this.childEnrolmentForm.get('enrollment_end').patchValue(null, { emitEvent: false });
                this.childEnrolmentForm.get('enrollment_end').reset();
                this.childEnrolmentForm.get('enrollment_end').disable({ emitEvent: false });
            }

            if (value === 'ACCS' || value === 'PEA' || value === 'OA')
            {
                this.childEnrolmentForm.get('signing_party').patchValue(null, { emitEvent: false });
                this.childEnrolmentForm.get('signing_party').reset();
                this.childEnrolmentForm.get('signing_party').disable({ emitEvent: false });

                this.childEnrolmentForm.get('signing_party_first_name').patchValue('', { emitEvent: false });
                this.childEnrolmentForm.get('signing_party_first_name').reset();
                this.childEnrolmentForm.get('signing_party_first_name').disable({ emitEvent: false });

                this.childEnrolmentForm.get('signing_party_last_name').patchValue('', { emitEvent: false });
                this.childEnrolmentForm.get('signing_party_last_name').reset();
                this.childEnrolmentForm.get('signing_party_last_name').disable({ emitEvent: false });
            }

            // clear validation
            this.childEnrolmentForm.get('individual').clearValidators();
            this.childEnrolmentForm.get('signing_party').clearValidators();
            this.childEnrolmentForm.get('arrangement_type_note').clearValidators();
            this.childEnrolmentForm.get('enrollment_end').clearValidators();
            this.childEnrolmentForm.get('reason_for_pea').clearValidators();

            // set validation
            if (value === 'CWA')
            {
                this.childEnrolmentForm.get('individual').setValidators([Validators.required]);
                // this.childEnrolmentForm.get('individual_crn').setValidators([Validators.required]);
                this.childEnrolmentForm.get('signing_party').setValidators([Validators.required]);
            }
            else if (value === 'RA')
            {
                this.childEnrolmentForm.get('signing_party').setValidators([Validators.required]);
            }
            else if (value === 'OA')
            {
                this.childEnrolmentForm.get('arrangement_type_note').setValidators([Validators.required, Validators.maxLength(50)]);
            }
            else if (value === 'PEA')
            {
                this.childEnrolmentForm.get('reason_for_pea').setValidators([Validators.required]);
                this.childEnrolmentForm.get('enrollment_end').setValidators([Validators.required])
            }

            setTimeout(() =>
            {
                this.childEnrolmentForm.get('arrangement_type_note').updateValueAndValidity();
                this.childEnrolmentForm.get('individual').updateValueAndValidity();
                this.childEnrolmentForm.get('signing_party').updateValueAndValidity();
                this.childEnrolmentForm.get('arrangement_type_note').updateValueAndValidity();
                this.childEnrolmentForm.get('enrollment_end').updateValueAndValidity();
                this.childEnrolmentForm.get('reason_for_pea').updateValueAndValidity();

                // disable all fields
                // if (!_.isNull(this.enrolment) && this.enrolment.isEnrolmentCeased())
                // {
                //     this.childEnrolmentForm.disable({ emitEvent: false });
                // }
            });

            this.updateScroll();
        }, 50);
    }

    /**
     * check if last submission reason is required
     *
     * @param {Date} value
     */
    validateLateSubmission(value: Date): void
    {
        this.childEnrolmentForm.get('late_submission').clearValidators();

        if (DateTimeHelper.parseMoment(value).isBefore(DateTimeHelper.now(), 'day'))
        {
            this.childEnrolmentForm.get('late_submission').setValidators([Validators.required]);

            this.childEnrolmentForm.get('late_submission').updateValueAndValidity();
        }
    }

    /**
     * show/hide elate submission input
     *
     * @param {MouseEvent} e
     */
    toggleLateSubmissionReason(e: MouseEvent): void
    {
        e.preventDefault();

        this.viewLateSubmissionReason = !this.viewLateSubmissionReason;
    }

    /**
     * check if individual has CRN
     */
    checkIndividualHasCRN(): boolean
    {
        if (!this.child.parents || this.fc.individual.value === '' || !this.child.parents.find(i => i.id === this.fc.individual.value))
        {
            return;
        }

        return this.fc.arrangement_type.value === 'CWA' && this.child.parents.find(i => i.id === this.fc.individual.value).ccsId === '';
    }

    /**
     * check if form values updatable
     *
     * @returns {boolean}
     */
    canSaveOrUpdateForm(): boolean
    {
        // this.child.CRN === '' || this.checkIndividualHasCRN()
        return (this.fc.session_type.value !== 'C' && !this.hasSessionSlots()) || this.buttonLoaderSubmit;
    }

    /**
     * check if form values changed
     *
     * @returns {boolean}
     */
    canSubmitForm(): boolean
    {
        return (!this.enrolment.isEnrolmentNew() && !this.enrolment.hasEnrolmentId()) || !this.enrolment.isEnrolmentApproved() || this.canSaveOrUpdateForm() || this.buttonLoader;
    }

    /**
     * check if form values changed
     *
     * @returns {boolean}
     */
    canReSubmitForm(): boolean
    {
        return !this.enrolment.isEnrolmentActive() && (this.canSaveOrUpdateForm() || this.buttonLoader);
    }

    /**
     * check if form values changed
     *
     * @returns {boolean}
     */
    canReactiveForm(): boolean
    {
        return !this.enrolment.enrolmentClosed() && !this.enrolment.hasEnrolmentId();
    }

    /**
     * set crn
     *
     * @param {MouseEvent} e
     * @param {string} code
     */
    setCRN(e: MouseEvent, code: string): void
    {
        e.preventDefault();

        const value = (code === 'child') ? this.child.CRN : this.child.parents.find(i => i.id === this.fc.individual.value).ccsId;

        this.setCRNModal = this._modalService
            .create({
                nzTitle: `${value ? 'Update' : 'Set'} ${(code === 'child') ? 'child' : 'individual (parent/guardian)'} CRN`,
                nzContent: ChildSetCRNComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'child-set-crn-modal',
                nzComponentParams: {
                    type: code,
                    value: value
                },
                // nzWrapClassName: 'pb-8',
                nzFooter: [
                    {
                        label: `${value ? 'UPDATE' : 'SET'} CRN`,
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.crnFrom.valid) || !componentInstance.isValueChanged() || componentInstance.hasWhiteSpace,
                        loading: false,
                        onClick: componentInstance =>
                        {
                            return new Promise(resolve =>
                            {
                                const setObj = {
                                    id: code === 'child' ? this.child.id : this.fc.individual.value,
                                    crn: componentInstance.fc.crn.value,
                                    type: code === 'child' ? 'crn0' : 'crn1'
                                };

                                this._childEnrolmentService
                                    .setCRN(setObj)
                                    .pipe(
                                        takeUntil(this._unsubscribeAll),
                                        // finalize(() => resolve())
                                    )
                                    .subscribe(
                                        message =>
                                        {
                                            if (code === 'child')
                                            {
                                                this.child.CRN = componentInstance.fc.crn.value;

                                                this.childEnrolmentForm.get('child_crn').patchValue(componentInstance.fc.crn.value, { emitEvent: false });
                                            }
                                            else
                                            {
                                                this.child.parents.find(i => i.id === this.fc.individual.value).ccsId = componentInstance.fc.crn.value;

                                                this.childEnrolmentForm.get('individual_crn').patchValue(componentInstance.fc.crn.value, { emitEvent: false });
                                            }

                                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                            this.setCRNModal.destroy();
                                        },
                                        error => {
                                            throw error;
                                        }
                                    );
                            });

                        }
                    }
                ]
            });
    }

    /**
     * get booking data
     *
     * @param {string} value
     */
    validateSessionType(value: string): void
    {
        // reset form values
        this.childEnrolmentForm.get('casual_fee').clearValidators();
        this.childEnrolmentForm.get('casual_fee').reset();
        this.childEnrolmentForm.get('casual_fee').patchValue(null, { emitEvent: false });

        this.childEnrolmentForm.get('casual_description').clearValidators();
        this.childEnrolmentForm.get('casual_description').reset();
        this.childEnrolmentForm.get('casual_description').patchValue('', { emitEvent: false });

        this.childEnrolmentForm.get('casual_hours').clearValidators();
        this.childEnrolmentForm.get('casual_hours').reset();
        this.childEnrolmentForm.get('casual_hours').patchValue('', { emitEvent: false });

        this.childEnrolmentForm.get('session_routine_type').clearValidators();
        this.childEnrolmentForm.get('session_routine_type').reset();
        this.childEnrolmentForm.get('session_routine_type').patchValue(null, { emitEvent: false });

        // clear session list
        this.sessionRoutines = [];

        if (value === 'C' || value === 'B')
        {
            this.setCausalValidators();
        }
        // else
        // {
        //     this.getEnrolmentBookings();
        // }

        setTimeout(() => this.updateScroll(), 50);
    }

    /**
     * set causal routine validators
     */
    setCausalValidators(): void
    {
        this.childEnrolmentForm.get('casual_fee').setValidators([Validators.required]);
        this.childEnrolmentForm.get('casual_fee').updateValueAndValidity();

        this.childEnrolmentForm.get('casual_description').setValidators([Validators.required, Validators.maxLength(1000)]);
        this.childEnrolmentForm.get('casual_description').updateValueAndValidity();

        this.childEnrolmentForm.get('casual_hours').setValidators([Validators.pattern('^[0-9]+(.[0-9]{0,2})?$')]);
        this.childEnrolmentForm.get('casual_hours').updateValueAndValidity();
    }

    /**
     * update casual default session hours
     *
     * @param {string} value
     */
    updateSessionHours(value: string): void
    {
        if (this.enrolment && !_.isEmpty(this.enrolment.initialRoutines) && this.enrolment.initialRoutines.filter((i: { cycleWeekNumber: string; }) => i.cycleWeekNumber === '0').length > 0)
        {
            return;
        } 
        
        // reset form values
        this.childEnrolmentForm.get('casual_hours').reset();
        this.childEnrolmentForm.get('casual_hours').patchValue('', { emitEvent: false });

        if (!_.isNull(value))
        {
            const fee: Fee = this.fees.find(i => i.id === value);

            this.childEnrolmentForm.get('casual_hours').patchValue(fee && fee.hasSession() ? fee.getSessionDuration() : '', { emitEvent: false });
        }
    }

    /**
     * check for new enrolment booking update
     *
     * @param {MouseEvent} e
     */
    updateSessionRoutine(e: MouseEvent): void
    {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.UPDATE.TITLE,
                    nzContent: AppConst.dialogContent.UPDATE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () =>
                    {
                        this.getEnrolmentBookings();

                        setTimeout(() => this.hasBookingUpdate = !this.hasBookingUpdate, 250);
                    }
                }
            );
    }

    /**
     * get fee information
     *
     * @param {string} id
     * @returns {Fee}
     */
    getFeeInfo(id: string): Fee
    {
        return this.fees.find(i => i.id === id);
    }

    /**
     * get enrolment booking list
     */
    getEnrolmentBookings(): void
    {
        this.sessionViewLoading = true;

        this._childEnrolmentService
            .getBookings(
                DateTimeHelper.parseMoment(this.fc.calendarWeek.value).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),
                this.fc.session_routine_type.value
            )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.sessionViewLoading = false)
            )
            .subscribe(
                response =>
                {
                    this.booking = response;

                    this.generateSessionView(this.booking);
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * pick session from master roll
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    pickSessionFromBooking(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.sessionViewLoading)
        {
            return;
        }

        (<HTMLElement> (<HTMLElement> this.weekCalenderInput.nativeElement).querySelector('.ant-picker-input')).click();
    }

    /**
     * auto fill session routines from initial session
     *
     * @param {MouseEvent} e
     */
    autoFillSessionRoutine(e: MouseEvent): void
    {
        e.preventDefault();

        // rebuild
        this.buildSessionView(true);

        for (const item of this.enrolment.initialRoutines)
        {
            if (!_.isNull(item.sessionDay) && item.sessionDay !== '')
            {
                const routine = this.sessionRoutines.find(i => DateTimeHelper.parseMoment(i.date).day() === +item.sessionDay && i.cycleWeek === +item.cycleWeekNumber);
                
                if (routine)
                {
                    routine.sessions.push({
                        cycleWeekNumber: item.cycleWeekNumber,
                        sessionDay: item.sessionDay,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        standardAmount: item.standardAmount,
                        sessionType: item.sessionType === 'CASUAL' ? '1' : '0',
                        sessionUnitOfMeasure: item.sessionUnitOfMeasure === 'HOUR' ? '1' : '0',
                        session: {
                            start: DateTimeHelper.convertStringToMins(item.startTime),
                            end: DateTimeHelper.convertStringToMins(item.endTime)
                        },
                        date: item.date,
                        fee: null,
                        addedManually: true
                    });

                    // sort session slots
                    routine.sessions = _.sortBy(routine.sessions, (i: SessionRoutineItem) => i.session.start);
                }
            } 
            // casual
            else
            {
                // set validators
                this.setCausalValidators();

                this.childEnrolmentForm.get('casual_fee').patchValue(this.fees.find(f => f.netAmount.toFixed(2) === item.standardAmount) ? this.fees.find(f => f.netAmount.toFixed(2) === item.standardAmount).id : null, { emitEvent: false });
                this.childEnrolmentForm.get('casual_hours').patchValue(item.hoursInCasualSession, { emitEvent: false });
                this.childEnrolmentForm.get('casual_description').patchValue(item.casualSessionDescription, { emitEvent: false });
            }
        }
        
        setTimeout(() => this.updateScroll(), 100);
    }

    /**
     * generate session routine view
     *
     * @param {Booking[]} bookings
     */
    generateSessionView(bookings: Booking[]): void
    {
        // reset
        this.sessionRoutines = [];

        const startDate = DateTimeHelper.parseMoment(this.fc.calendarWeek.value).startOf('isoWeek');
        const endDate = startDate.clone().add(this.fc.session_routine_type.value === '0' ? 6 : 13, 'd');
        const dateRange = DateTimeHelper.getDateRange(startDate, endDate);

        // generate week map
        for (const [index, item] of dateRange.entries())
        {
            const sessions: SessionRoutineItem[] = [];

            const _bookings = _.sortBy(bookings.filter(i => i.date === item.format('YYYY-MM-DD')), slot => slot.sessionStart);

            // format session
            for (const session of _bookings)
            {
                sessions.push({
                    cycleWeekNumber: dateRange.length > 6 && index > 6 ? 2 : 1,
                    sessionDay: DateTimeHelper.parseMoment(session.date).isoWeekday().toString(),
                    startTime: DateTimeHelper.convertMinTo24HourString(session.sessionStart),
                    endTime: DateTimeHelper.convertMinTo24HourString(session.sessionEnd),
                    standardAmount: session.getBookingFeeAmount().toFixed(2),
                    sessionType: session.fee.type,
                    sessionUnitOfMeasure: session.fee.frequency,

                    date: item.format('YYYY-MM-DD'),
                    fee: session.fee.id,
                    session: {
                        start: session.sessionStart,
                        end: session.sessionEnd,
                    },
                    addedManually: false
                });
            }

            if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
            {
                continue;
            }

            this.sessionRoutines.push({
                id: uuid.v4(),
                date: item.toDate(),
                day: _.toLower(item.format('ddd')),
                cycleWeek: dateRange.length > 6 && index > 6 ? 2 : 1,
                sessions: sessions
            });
        }

        setTimeout(() => this.updateScroll(), 100);
    }

    /**
     * generate edit session routine view
     */
    generateEditSessionView(): void
    {
        // reset
        this.sessionRoutines = [];

        const startDate = DateTimeHelper.now().startOf('isoWeek');
        const endDate = startDate.clone().add(this.fc.session_routine_type.value === '0' ? 6 : 13, 'd');
        const dateRange = DateTimeHelper.getDateRange(startDate, endDate);

        // generate week map
        for (const [index, item] of dateRange.entries())
        {
            if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
            {
                continue;
            }

            const sessions = this.enrolment.routines.routine.filter((i: any) => +i.sessionDay === item.day());

            this.sessionRoutines.push({
                id: uuid.v4(),
                date: item.toDate(),
                day: _.toLower(item.format('ddd')),
                cycleWeek: dateRange.length > 6 && index > 6 ? 2 : 1,
                sessions: sessions
            });
        }
    }

    /**
     * build session list based on routine type
     *
     * @param {boolean} [ignoreSessions=false]
     */
    buildSessionView(ignoreSessions: boolean = false): void
    {
        // reset
        this.sessionRoutines = [];

        const startDate = DateTimeHelper.now().startOf('isoWeek');
        const endDate = startDate.clone().add(this.fc.session_routine_type.value === '0' ? 6 : 13, 'd');
        const dateRange = DateTimeHelper.getDateRange(startDate, endDate);

        // generate week map
        for (const [index, item] of dateRange.entries())
        {
            const sessions: SessionRoutineItem[] = (!_.isNull(this.enrolment) && !ignoreSessions) ? this.enrolment.routines.routine.filter((i: any) => +i.sessionDay === item.day()) : [];

            if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
            {
                continue;
            }

            this.sessionRoutines.push({
                id: uuid.v4(),
                date: item.toDate(),
                day: _.toLower(item.format('ddd')),
                cycleWeek: dateRange.length > 6 && index > 6 ? 2 : 1,
                sessions: sessions
            });
        }

        setTimeout(() => this.updateScroll(), 100);
    }

    /**
     * check if session has bookings
     *
     * @returns {boolean}
     */
    hasSessionSlots(): boolean
    {
        return this.sessionRoutines.filter(i => !_.isEmpty(i.sessions)).length > 0;
    }

    /**
     * add session to enrolment
     *
     * @param {MouseEvent} e
     * @param {SessionRoutine} item
     */
    addSession(e: MouseEvent, item: SessionRoutine): void
    {
        e.preventDefault();

        this.setSessionModal = this._modalService
            .create({
                nzTitle: 'Add Session',
                nzContent: ChildSetEnrolmentSessionComponent,
                nzMaskClosable: false,
                nzComponentParams: {
                    action: AppConst.modalActionTypes.NEW,
                    fees: this.fees,
                    selected: item,
                    value: null
                },
                nzWrapClassName: 'child-set-enrolment-session-modal',
                nzFooter: [
                    {
                        label: 'SAVE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.sessionFrom.valid) || !componentInstance.isValueChanged(),
                        onClick: componentInstance =>
                        {
                            if (componentInstance!.sessionFrom.valid)
                            {
                                const formData = componentInstance.getSelectedSession();
                                const _sessionStart: number = +(formData.fee.hasSession() ? formData.fee.sessionStart : _.head(formData.session));
                                const _sessionEnd: number = +(formData.fee.hasSession() ? formData.fee.sessionEnd : _.last(formData.session));

                                item.sessions.push({
                                    cycleWeekNumber: item.cycleWeek,
                                    sessionDay: DateTimeHelper.parseMoment(item.date).isoWeekday().toString(),
                                    startTime: DateTimeHelper.convertMinTo24HourString(_sessionStart),
                                    endTime: DateTimeHelper.convertMinTo24HourString(_sessionEnd),
                                    standardAmount: formData.fee.getFeeAmount().toFixed(2),
                                    sessionType: formData.fee.type,
                                    sessionUnitOfMeasure: formData.fee.frequency,
                                    session: {
                                        start: _sessionStart,
                                        end: _sessionEnd,
                                    },
                                    date: DateTimeHelper.parseMoment(item.date).format('YYYY-MM-DD'),
                                    fee: formData.fee.id,
                                    addedManually: true
                                });

                                // sort session slots
                                item.sessions = _.sortBy(item.sessions, (i: SessionRoutineItem) => i.session.start);

                                this.setSessionModal.destroy();
                            }
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.setSessionModal.destroy()
                    }
                ]
            });
    }

    /**
     * edit session to enrolment
     *
     * @param {MouseEvent} e
     * @param {SessionRoutineItem} item
     * @param {SessionRoutine} selected
     * @returns {void}
     */
    editSession(e: MouseEvent, item: SessionRoutineItem, selected: SessionRoutine, index: number): void
    {
        e.preventDefault();

        // if (!item.addedManually) return;

        this.setSessionModal = this._modalService
            .create({
                nzTitle: 'Edit Session',
                nzContent: ChildSetEnrolmentSessionComponent,
                nzMaskClosable: false,
                nzComponentParams: {
                    action: AppConst.modalActionTypes.EDIT,
                    fees: this.fees,
                    selected: selected,
                    value: item
                },
                nzWrapClassName: 'child-set-enrolment-session-modal',
                nzFooter: [
                    {
                        label: 'REMOVE',
                        type: 'default',
                        onClick: () =>
                        {
                            setTimeout(() => _.remove(selected.sessions, (i) => i.fee === item.fee), 50);

                            this.setSessionModal.destroy();
                        }
                    },
                    {
                        label: 'UPDATE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.sessionFrom.valid) || !componentInstance.isValueChanged(),
                        onClick: componentInstance =>
                        {
                            if (componentInstance!.sessionFrom.valid)
                            {
                                const formData = componentInstance.getSelectedSession();
                                const _sessionStart: number = +(formData.fee.hasSession() ? formData.fee.sessionStart : _.head(formData.session));
                                const _sessionEnd: number = +(formData.fee.hasSession() ? formData.fee.sessionEnd : _.last(formData.session));

                                selected.sessions[index] = {
                                    cycleWeekNumber: selected.cycleWeek,
                                    sessionDay: DateTimeHelper.parseMoment(selected.date).isoWeekday().toString(),
                                    startTime: DateTimeHelper.convertMinTo24HourString(_sessionStart),
                                    endTime: DateTimeHelper.convertMinTo24HourString(_sessionEnd),
                                    standardAmount: formData.fee.netAmount.toFixed(2),
                                    sessionType: formData.fee.type,
                                    sessionUnitOfMeasure: formData.fee.frequency,
                                    session: {
                                        start: _sessionStart,
                                        end: _sessionEnd,
                                    },
                                    date: DateTimeHelper.parseMoment(selected.date).format('YYYY-MM-DD'),
                                    fee: formData.fee.id,
                                    addedManually: true
                                };

                                // sort session slots
                                selected.sessions = _.sortBy(selected.sessions, (i: SessionRoutineItem) => i.session.start);

                                this.setSessionModal.destroy();
                            }
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.setSessionModal.destroy()
                    }
                ]
            });
    }

    /**
     * get form values
     *
     * @param {boolean} [editMode=true]
     * @returns {*}
     */
    getFormValues(editMode: boolean = true): any
    {
        const sessionList = [];

        // insert casual booking
        if (this.fc.session_type.value === 'C' || this.fc.session_type.value === 'B')
        {
            const fee: Fee = this.fees.find(i => i.id === this.fc.casual_fee.value);

            const casual = {
                cycleWeekNumber: '0',
                standardAmount: fee.netAmount.toFixed(2),
                casualSessionDescription: this.fc.casual_description.value,
                sessionType: fee.type,
                sessionUnitOfMeasure: fee.frequency,
                fee: this.fc.casual_fee.value,
                addedManually: false
            }

            if(fee.frequency === '0') casual['hoursInCasualSession'] = this.fc.casual_hours.value;

            sessionList.push(casual);
        }

        // insert routine booking
        _.cloneDeep(this.sessionRoutines)
            .map(i => i.sessions.map(s => s))
            .filter(i => !_.isEmpty(i))
            .map(i =>
            {
                for (const s of i)
                {
                    sessionList.push(s);
                }
            });

        const sendObj = {
            enrol_id: (this.enrolment && this.enrolment.enrolId) ? this.enrolment.enrolId : '',
            enrollment_start: DateTimeHelper.getUtcDate(this.fc.enrollment_start.value),
            individual: this.fc.individual.value,
            child: this.child.id,
            late_submission: this.fc.late_submission.value,
            arrangement_type: this.fc.arrangement_type.value,
            reason_for_pea: this.fc.reason_for_pea.value,
            session_type: this.fc.session_type.value,
            session_is_case: this.fc.session_is_case.value,
            signing_party: this.fc.signing_party.value,
            is_case_details: this.fc.is_case_details.value,
            notes: this.fc.notes.value,
            weeks_cycle: this.fc.session_type.value !== 'C' ? (this.fc.session_routine_type.value === '0' ? '1' : '2') : '0',
            sessions: sessionList
        };

        if (this.fc.enrollment_end.enabled && !_.isNull(this.fc.enrollment_end.value))
        {
            sendObj['enrollment_end'] = DateTimeHelper.getUtcDate(this.fc.enrollment_end.value);
        }

        if (this.fc.arrangement_type.value === 'OA')
        {
            sendObj['arrangement_type_note'] = this.fc.arrangement_type_note.value;
        }

        if (this.fc.signing_party.value === '1')
        {
            sendObj['signing_party_first_name'] = this.fc.signing_party_first_name.value;
            sendObj['signing_party_last_name'] = this.fc.signing_party_last_name.value;
        }

        if (editMode)
        {
            sendObj['id'] = this.enrolment.id;
        }

        return sendObj;
    }

    /**
     * save form
     *
     * @param {MouseEvent} e
     */
    onFormSaveOrUpdate(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.childEnrolmentForm.invalid || this.buttonLoaderSubmit)
        {
            return;
        }

        this._logger.debug('[child enrolment object]', this.getFormValues(!_.isNull(this.enrolment)));

        this.buttonLoader = true;

        this._childEnrolmentService[!_.isNull(this.enrolment) ? 'updateEnrolment' : 'storeEnrolment'](this.getFormValues(!_.isNull(this.enrolment)))
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                response =>
                {
                    // replace url
                    if (!this.enrolment)
                    {
                        this._location.replaceState(this._location.path() + `/${response.item.id}`);
                    }

                    if (!isEqual(response.item, this.enrolment))
                    {
                        setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
                    }

                    this.enrolment = response.item;
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.childEnrolmentForm.invalid || this.canSubmitForm() || this.buttonLoader)
        {
            return;
        }

        const sendObj = this.getFormValues();

        this._logger.debug('[submit child enrolment]', sendObj);

        this.buttonLoaderSubmit = true;

        this._childEnrolmentService
            .submitEnrolment(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoaderSubmit = false)
            )
            .subscribe(
                response =>
                {
                    this.enrolment = response.item;

                    setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    /**
     * resubmit form
     *
     * @param {MouseEvent} e
     */
    onFormReSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.childEnrolmentForm.invalid || this.canReSubmitForm() || this.buttonLoader)
        {
            return;
        }

        const sendObj = this.getFormValues();

        this._logger.debug('[submit child enrolment resubmit]', sendObj);

        this.buttonLoaderSubmit = true;

        this._childEnrolmentService
            .submitEnrolment(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoaderSubmit = false)
            )
            .subscribe(
                response =>
                {
                    this.enrolment = response.item;

                    setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    /**
     * reactivate from
     *
     * @param {MouseEvent} e
     */
    onFormReactivate(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.childEnrolmentForm.invalid || this.canReactiveForm() || this.buttonLoader)
        {
            return;
        }

        const sendObj = this.getFormValues();

        // add reactive flag
        sendObj['form_type'] = '200A';

        this._logger.debug('[submit child enrolment]', sendObj);

        this.buttonLoaderSubmit = true;

        this._childEnrolmentService
            .submitEnrolment(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoaderSubmit = false)
            )
            .subscribe(
                response =>
                {
                    this.enrolment = response.item;

                    setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    /**
     * read enrolment details from api
     *
     * @param {MouseEvent} e
     * @param {Enrolment} item
     */
    updateEnrolmentDetails(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoaderSubmit = this.buttonLoader = true;

        this._childEnrolmentService
            .checkEnrolmentStatus(this.enrolment.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoaderSubmit = this.buttonLoader = false)
            )
            .subscribe(
                response => setTimeout(() => { this.enrolment = response; }, 150),
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * end enrolment
     *
     * @param {MouseEvent} e
     */
    closeEnrolment(e: MouseEvent): void
    {
        e.preventDefault();

        this.endEnrolmentModal = this._modalService
            .create({
                nzTitle: 'End Enrolment',
                nzContent: ChildEndEnrolmentComponent,
                nzWrapClassName: 'child-end-enrolment-modal',
                nzMaskClosable: false,
                nzComponentParams: {
                    enrolment: this.enrolment,
                    value: this.fc.enrollment_end.value
                },
                nzFooter: [
                    {
                        label: 'SAVE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.form.valid) || !componentInstance.isValueChanged(),
                        loading: false,
                        onClick: componentInstance =>
                        {
                            return componentInstance
                                .updateEnrolment()
                                .then(
                                    res => 
                                    {
                                        try
                                        {
                                            this.enrolment = res.item;

                                            this.childEnrolmentForm.get('enrollment_end').patchValue(DateTimeHelper.parseMomentDate(this.enrolment.enrolEnd), { emitEvent: false });

                                            setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                                            
                                            this.endEnrolmentModal.destroy();
                                        }
                                        catch(error)
                                        {
                                            throw error;
                                        }
                                    }
                                );
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.endEnrolmentModal.destroy()
                    }
                ]
            });
        
    }
}
