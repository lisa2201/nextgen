import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion, slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl, FormArray, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { ISCase, SelectInterface, EducatorArrayObject, WeekDayArrayObject } from '../../is-case.model';
import { User } from 'app/main/modules/user/user.model';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { IsCaseService } from '../../services/is-case.service';
import * as uuid from 'uuid';
import * as moment from 'moment';
import { takeUntil, finalize } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Child } from 'app/main/modules/child/child.model';
import { IsClaimAddEducatorDialogComponent } from '../is-claim-add-educator-dialog/is-claim-add-educator-dialog.component';
import * as _ from 'lodash';
import { IsCaseApiTimeConverterPipe } from '../../is-case-api-time-converter.pipe';
import { NGXLogger } from 'ngx-logger';
import { Enrolment } from 'app/main/modules/child/enrolment/models/enrolment.model';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ISCaseClaimSubmission } from '../../is-case-claim-submission.model';

@Component({
    selector: 'app-create-is-claim-dialog',
    templateUrl: './create-is-claim-dialog.component.html',
    styleUrls: ['./create-is-claim-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CreateIsClaimDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    isClaimForm: FormGroup;
    buttonLoading: boolean;
    isCase: ISCase;
    educators: User[];
    children: Child[];
    serviceProvisions: SelectInterface[];
    paymentTypes: SelectInterface[];
    weekDayArrayMap: string[];
    failedMessage: string | null;

    claimRef: string;

    editMode: boolean;
    submissionData: ISCaseClaimSubmission | null;

    weekDaysArray: FormArray;

    dialogRef: any;
    minimumAdditionalEducators: number;
    weekDayErrorStatus: string;

    selectedEducators: EducatorArrayObject[];
    selectedEducatorsCount: number;

    public caseStartDateValidation: moment.Moment;
    public caseEndDateValidation: moment.Moment;

    constructor(
        public matDialogRef: MatDialogRef<CreateIsClaimDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _isCaseService: IsCaseService,
        private _matDialog: MatDialog,
        private _apiTimeConverter: IsCaseApiTimeConverterPipe,
        private _logger: NGXLogger
    ) {

        this.unsubscribeAll = new Subject();
        this.editMode = this._data.edit ? true : false;
        this.submissionData = this._data.submission ? this._data.submission : null;    
        this.claimRef = uuid.v4();
        this.isCase = _data.isCase;
        this.educators = this._data.educators;
        this.children = this._data.children;
        this.buttonLoading = false;
        this.minimumAdditionalEducators = 0;
        this.selectedEducatorsCount = 0;

        this.caseStartDateValidation = moment(this.isCase.StartDate).add(6, 'days');
        this.caseEndDateValidation = moment(this.isCase.EndDate);

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.setSelectValues();

        this.setWeekArray();

        this.createForm();

        this.addWeekdays();

        if (this.editMode) {

            this._logger.debug('[Edit Mode]');
            this.restoreEditData();
            this.failedMessage = `Last submission failed reason: ${this.submissionData.fail_reason}`;

        } else {

            this.failedMessage = null;
            this._logger.debug('[Create Mode]');
            
        }

    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number {
        return index;
    }

    setSelectValues(): void {

        this.paymentTypes = [
            {
                name: 'IDF Subsidy-Centre Based Care',
                value: 'IDF Subsidy-Centre Based Care'
            },
            {
                name: 'IDF Subsidy-Pupil Free Day',
                value: 'IDF Subsidy-Pupil Free Day'
            },
            {
                name: 'IDF Subsidy-FDC Top Up',
                value: 'IDF Subsidy-FDC Top Up'
            },
            {
                name: 'IDF Subsidy-FDC Excursion',
                value: 'IDF Subsidy-FDC Excursion'
            },
            {
                name: 'IDF Subsidy-FDC Pupil Free Day',
                value: 'IDF Subsidy-FDC Pupil Free Day'
            },
            {
                name: 'IDF Subsidy-Immediate Support',
                value: 'IDF Subsidy-Immediate Support'
            },
            {
                name: 'IHC-Inclusion Support',
                value: 'IHC-Inclusion Support'
            },
            {
                name: 'IHC-Pupil Free Day',
                value: 'IHC-Pupil Free Day'
            },
        ];

        this.serviceProvisions = [
            {
                name: 'Face to Face',
                value: 'Face-to-Face'
            },
            {
                name: 'Non Face to Face',
                value: 'Non Face-to-Face'
            }
        ];

    }

    setWeekArray(): void {

        this.weekDayArrayMap = [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
        ];

    }

    createForm(): void {

        this.isClaimForm = this._formBuilder.group({
            service_provision: new FormControl(null, [Validators.required]),
            payment_type: new FormControl(null, [Validators.required]),
            hours_claimed: new FormControl(null, [Validators.required, Validators.maxLength(6), this.totalHoursValidator(), Validators.pattern(/[0-9]{3}:[0-5]{1}[0-9]{1}/)]),
            week_ending: new FormControl(null, [Validators.required]),
            week_days: this._formBuilder.array([], [Validators.required, this.weekDayValidator()]),
            enrolments: new FormControl([]),
            educators_declaration: new FormControl(false, [Validators.requiredTrue])
        });

        this.weekDaysArray = <FormArray> this.isClaimForm.get('week_days');

        this.setEnrolmentDefaults();

        this.isClaimForm.get('educators_declaration').disable();

        this.isClaimForm.get('week_ending')
            .valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((date) => {
                this.weekEndingChangeHandler(date);
            });

        this.isClaimForm.get('service_provision')
            .valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {
                this.serviceProvisionChangeHandler(value);
            });

        this.isClaimForm.get('payment_type')
            .valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {
                this.paymentTypeChangeHandler(value);
            });

    }

    get fc(): any {
        return this.isClaimForm.controls;
    }

    hasValidator(control: string, validator: string): boolean {
        if (_.isNull(this.isClaimForm.get(control).validator)) {
            return false;
        }
        
        const formControl = this.isClaimForm.get(control).validator({} as AbstractControl);
    
        return formControl && formControl.hasOwnProperty(validator);
    }

    disabledEndDate = (date: Date): boolean => {

        const isNotSunday = date.getDay() !== 0 ? true : false;
        const endViolation = moment(date).isAfter(moment().add(6, 'days')) ? true : false;
        const caseEndViolation = moment(date).isAfter(this.caseEndDateValidation.clone().add(1,'day')) ? true : false;
        const startViolation = moment(date).isSameOrBefore(this.caseStartDateValidation) ? true : false;

        return startViolation || endViolation || isNotSunday || caseEndViolation;

    }

    weekEndingChangeHandler(date: any): void {
        const startDate = moment(date).startOf('isoWeek');

        this.weekDaysArray.controls.map((value: FormGroup, index: number) => {

            value.patchValue({
                date: startDate.day(value.get('day').value).format('YYYY-MM-DD')
            }, { emitEvent: false });

            startDate.add(1, 'day');

        });
    }

    serviceProvisionChangeHandler(value: string): void {

        const enrolmentControl: AbstractControl = this.isClaimForm.get('enrolments');

        if (value === this.serviceProvisions[0].value) {
            // Face to face 
            enrolmentControl.setValidators([Validators.required]);
        } else {
            enrolmentControl.clearValidators();
        }

        enrolmentControl.updateValueAndValidity();

    }

    paymentTypeChangeHandler(value: string): void {

        this.minimumAdditionalEducators = this._isCaseService.getMinimumEducators(this.isCase.CaseServiceType, this.isCase.Type, value);
        this.weekDaysArray.updateValueAndValidity();
        this.isClaimForm.get('hours_claimed').updateValueAndValidity();

    }

    setEnrolmentDefaults(): void {

        let enrolments: string[];
        let filteredChildren: Child[];

        if (this.editMode && this.submissionData.enrolments && _.isArray(this.submissionData.enrolments) && this.submissionData.enrolments.length > 0) {
            // Edit

            enrolments = this.submissionData.enrolments;

            filteredChildren = _.filter(this.children, (child: Child) => {
            
                if (child.enrollments && child.enrollments.length > 0 && enrolments.indexOf(child.enrollments[0].enrolId) !== -1) {
                    return true;
                } else {
                    return false;
                }
    
            });

        } else {
            // New 
           
            enrolments = this.isCase.ListOfISEnrolments ? _.map(this.isCase.ListOfISEnrolments.ISEnrolment, 'EnrolmentId') : [];

            filteredChildren = _.filter(this.children, (child: Child) => {
                
                if (child.enrollments && child.enrollments.length > 0 && enrolments.indexOf(child.enrollments[0].enrolId) !== -1) {
                    return true;
                } else {
                    return false;
                }
    
            });
            
        }
        
        if (filteredChildren.length > 0) {
            this.isClaimForm.get('enrolments').patchValue(_.map(filteredChildren, 'id'), {emitEvent: false});
        }

    }

    getEnrolmentLabel(child: Child): string {
        return `${child.getFullName()} (${_.first(child.enrollments).enrolId})`;
    }

    getWeekClaimedHours(weekIndex: number): string {

        const duration = this._isCaseService.getDisplayTimeMomentObject(null);

        this.getWeekDayEducatorArray(weekIndex).controls.map((form: FormGroup) => {

            const claimed = this._isCaseService.getDisplayTimeMomentObject(form.value.hours_claimed);

            duration.add(claimed);

        });

        return this._isCaseService.durationToDisplay(duration);

    }

    getWeekAvailableHours(weekIndex: number): string {

        const totalTime = this.weekDaysArray.controls[weekIndex].value.totalTime;
        const totalWeekHours = this._isCaseService.getDisplayTimeMomentObject(totalTime);

        const claimed = this.getWeekClaimedHours(weekIndex);
        const claimedHours = this._isCaseService.getDisplayTimeMomentObject(claimed);

        totalWeekHours.subtract(claimedHours);

        return this._isCaseService.durationToDisplay(totalWeekHours);

    }

    getWeekDaysFormArrayContols(): AbstractControl[] {
        return this.weekDaysArray.controls;
    }

    getWeekDayEducatorArrayControls(index: number): AbstractControl[] {
        return (<FormArray> this.weekDaysArray.controls[index].get('educatorArray')).controls;
    }

    getWeekDayEducatorArray(index: number): FormArray {
        return (<FormArray> this.weekDaysArray.controls[index].get('educatorArray'));
    }

    addWeekdays(): void {

        const weekArray = (<FormArray> this.isClaimForm.get('week_days'));

        this.emptyWeekArray();

        const careHours = this.isCase.ListOfCareHours && this.isCase.ListOfCareHours.CareHours ? this.isCase.ListOfCareHours.CareHours : [];

        for (const day of this.weekDayArrayMap) {

            const dayIndex = _.findIndex(careHours, {'DayOfCare': _.capitalize(day)});

            if (dayIndex !== -1) {

                const dayControl = this._formBuilder.group({
                    day: day,
                    date: null,
                    educatorArray: this._formBuilder.array([]),
                    totalTime: this._apiTimeConverter.transform(careHours[dayIndex].DayHours)
                });

                weekArray.push(dayControl);

            }

        }

    }

    weekDayValidator(): ValidatorFn {

        return (control: FormArray): ValidationErrors | null => {

            let count = 0;

            control.controls.map((group: FormGroup) => {
                count += group.value.educatorArray.length;
            });

            if (count >= this.minimumAdditionalEducators) {
                this.weekDayErrorStatus = '';
                return null;
            } else {
                this.weekDayErrorStatus = 'error';
                this._logger.debug('Additional educator count error');
                return {educatorCount: true, requiredNumber: this.minimumAdditionalEducators, givenNumber: count};
            }

        };

    }

    totalHoursValidator(): ValidatorFn {

        return (control: AbstractControl): ValidationErrors | null => {

            if (control.value) {

                const value: string = control.value;
                
                if (value.match(/[0-9]{3}:[0-5]{1}[0-9]{1}/) !== null && value.length <= 6 && this.minimumAdditionalEducators > 0) {

                    const duration = this._isCaseService.getDisplayTimeMomentObject(null);

                    this.weekDaysArray.value.map((arrVal: any, index: number) => {

                        const weekHours = this.getWeekClaimedHours(index);

                        duration.add(this._isCaseService.getDisplayTimeMomentObject(weekHours));

                    });

                    const formatedValue = this._isCaseService.getDisplayTimeMomentObject(value);

                    const diff = duration.clone().subtract(formatedValue.clone()).asMilliseconds();

                    if (Math.sign(diff) === 0) {
                        this._logger.debug('Value matches total hours');
                        return null;
                    } else {
                        this._logger.debug('Total hours mismatch error');
                        return {totalHours: true, requiredHours: this._isCaseService.durationToDisplay(duration)};
                    }

                } else {
                    return null;
                }

            } else {
                return null;
            }

        };

    }

    emptyWeekArray(): void {

        const weekArray = (<FormArray> this.isClaimForm.get('week_days'));

        while (weekArray.length) {
            weekArray.removeAt(0);
        }

    }

    addEducatorDialog(event: MouseEvent, weekIndex: number, educatorIndex: number | null, edit: boolean = false): void {

        event.preventDefault();
        
        let editData: EducatorArrayObject | null;

        const selectedEducators = _.map(this.isClaimForm.value.week_days[weekIndex].educatorArray, (val: any) => val.educator_id);

        const filteredEducators = _.filter(this.educators, (educator: User) => !_.includes(selectedEducators, educator.id));
        
        if (edit) {
            editData = this.getWeekDayEducatorArray(weekIndex).value[educatorIndex];
        } else {
            editData = null;
        }

        this.dialogRef = this._matDialog
            .open(IsClaimAddEducatorDialogComponent,
                {
                    panelClass: 'is-claim-educator-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        educators: editData ? this.educators : filteredEducators,
                        editData: editData,
                        remainingTime: this.getWeekAvailableHours(weekIndex),
                        response: {}
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((response: EducatorArrayObject) => {

                if (!response) {
                    return;
                }

                if (edit) {
                    this.updateEducator(weekIndex, educatorIndex, response);
                } else {
                    this.addEducator(weekIndex, response);
                }

            });

    }

    addEducator(weekIndex: number, object: EducatorArrayObject): void {
        this.getWeekDayEducatorArray(weekIndex).push(this._formBuilder.group(object));
        this.isClaimForm.get('hours_claimed').updateValueAndValidity();
        this.isClaimForm.get('educators_declaration').enable();
        this.selectedEducatorsCount ++;
    }

    updateEducator(weekIndex: number, educatorIndex: number, object: EducatorArrayObject): void {
        this.getWeekDayEducatorArrayControls(weekIndex)[educatorIndex] = this._formBuilder.group(object);
    }

    removeEducator(weekIndex: number, index: number): void {
        this.getWeekDayEducatorArray(weekIndex).removeAt(index);
        this.selectedEducatorsCount --;
        this.isClaimForm.get('hours_claimed').updateValueAndValidity();

        if (this.selectedEducatorsCount === 0) {
            this.isClaimForm.get('educators_declaration').disable();
        }

    }

    disableEducatorAddButton(weekIndex: number): boolean {
        return this.getWeekDayEducatorArray(weekIndex).controls.length === this.educators.length ? true : false;
    }

    mapEnrolments(): string[] {

        const isEnrolmentsids: string[] = this.isCase.ListOfISEnrolments ? _.map(this.isCase.ListOfISEnrolments.ISEnrolment, 'EnrolmentId') : [];
        const enrolmentIds: string[] = [];

        if (this.fc.enrolments.value) {

            _.map(this.fc.enrolments.value, (value: string) => {

                const chindex = _.findIndex(this.children, {'id': value});

                if (chindex !== -1) {

                    this.children[chindex].enrollments.map((enrolment: Enrolment) => {

                        if (_.indexOf(isEnrolmentsids, enrolment.enrolId) !== -1) {
                            enrolmentIds.push(enrolment.enrolId);
                        }

                    });

                }

            });

        }

        return enrolmentIds;

    }

    restoreEditData(): void {

        this.isClaimForm.patchValue({
            service_provision: this.submissionData.service_provision,
            payment_type: this.submissionData.payment_type,
            hours_claimed: this.submissionData.hours_claimed,
            week_ending: this.submissionData.week_ending,
        });

        if (this.submissionData.week_days && _.isArray(this.submissionData.week_days) && this.submissionData.week_days.length > 0) {

            _.forEach(this.submissionData.week_days, (dayObject: WeekDayArrayObject, index: number) => {

                if (dayObject.educatorArray && _.isArray(dayObject.educatorArray) && dayObject.educatorArray.length > 0) {

                    _.forEach(dayObject.educatorArray, (educatorObj: EducatorArrayObject, edIndex: number) => {

                        this.addEducator(index, educatorObj);

                        this.isClaimForm.get('educators_declaration').patchValue(true, { emitEvent: false});

                    });

                }

            });

        }

        setTimeout(() => {

            _.forEach(this.isClaimForm.controls, (control: FormControl, index: any) => {

                if (control instanceof FormControl) {
                    control!.markAsDirty();
                    control!.updateValueAndValidity();
                }

            });

        }, 100);


    }

    onSubmit(): void {


        if (this.isClaimForm.invalid) {
            return;
        }

        const sendObj = {
            educators_declaration: this.fc.educators_declaration.value,
            hours_claimed: this.fc.hours_claimed.value,
            payment_type: this.fc.payment_type.value,
            children: this.fc.enrolments.value,
            enrolments: this.mapEnrolments(),
            service_provision: this.fc.service_provision.value,
            week_ending: DateTimeHelper.getUtcDate(this.fc.week_ending.value),
            week_days: this.fc.week_days.value,
            case_id: this.isCase.ISCaseId,
            is_case: this.isCase,
            edit: this.editMode,
            submission_id: this.editMode ? this.submissionData.id : null
        };

        
        this._logger.debug('[Claim Object]', sendObj);

        this.buttonLoading = true;

        this._isCaseService.addISCaseClaim(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;

                    if (this.editMode) {
                        this._isCaseService.listISCaseClaimSubmissions();
                    }
                    
                })
            )
            .subscribe((response) => {

                setTimeout(() => this.matDialogRef.close(response), 250);

            });

    }

}
