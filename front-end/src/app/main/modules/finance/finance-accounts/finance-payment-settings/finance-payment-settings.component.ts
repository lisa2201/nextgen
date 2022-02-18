import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { CommonService } from 'app/shared/service/common.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { Location } from '@angular/common';
import * as _ from 'lodash';
import * as moment from 'moment';
import { FinanceAccountsService } from '../services/finance-accounts.service';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, finalize } from 'rxjs/operators';
import { FinancePaymentPlan } from '../finance-payment-plan.model';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { differenceInCalendarDays } from 'date-fns';
import { BillingTerm } from '../../shared/model/finance.model';
import { FinanceService } from '../../shared/services/finance.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { MatDialog } from '@angular/material/dialog';
import { ParentPaymentScheduleDetailDialogComponent } from '../../shared/dialogs/parent-payment-schedule-detail-dialog/parent-payment-schedule-detail-dialog.component';
import { ParentPaymentScheduleEditDialogComponent } from '../../shared/dialogs/parent-payment-schedule-edit-dialog/parent-payment-schedule-edit-dialog.component';

@Component({
    selector: 'app-finance-payment-plans',
    templateUrl: './finance-payment-settings.component.html',
    styleUrls: ['./finance-payment-settings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancePaymentSettingsComponent implements OnInit, OnDestroy {

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;

    private unsubscribeAll: Subject<any>;

    paymentPlanForm: FormGroup;
    buttonLoading: boolean;
    tableLoader: boolean;

    paymentFrequencies: { name: string, value: string }[];
    billingTerms: BillingTerm[];
    billingTermsList: BillingTerm[];
    billingTermDescriptionMap: any;
    paymentdays: { name: string, value: string }[];
    userId: string;
    today: any;
    nextPaymentDate: string;
    confirmModal: NzModalRef;
    dialogRef: any;

    planList: FinancePaymentPlan[];

    constructor(
        private _location: Location,
        private _formBuilder: FormBuilder,
        private _commonService: CommonService,
        private _logger: NGXLogger,
        private _financeAccountsService: FinanceAccountsService,
        private _financeService: FinanceService,
        private _activatedRoute: ActivatedRoute,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _matDialog: MatDialog
    ) {
        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.nextPaymentDate = null;
        

        this.today = new Date();
        this.billingTermDescriptionMap = {};

        this.setSelectValues();

        this.userId = this._activatedRoute.snapshot.paramMap.get('id');
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.createForm();

        this._financeAccountsService.onFinancePaymentPlanChanged
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((response: FinancePaymentPlan[]) => {
                this._logger.debug('[financial_plans]', response);
                this.planList = response;

                if (this.planList.length === 0) {
                    this.paymentPlanForm.get('activation_date').disable();
                }
            });

        this._financeAccountsService.onTableLoaderChanged
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((value) => {
                this.tableLoader = value;
            });

        this.paymentPlanForm.get('payment_frequency').valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {

                const paymentDay = this.paymentPlanForm.get('payment_day');
                const billingTerm = this.paymentPlanForm.get('billing_term');

                if (!value) {
                    return;
                }

                if (value === 'monthly') {

                    this.billingTerms = _.filter(this.billingTermsList, (val: BillingTerm) => {
                        return (val.frequency === 'all' || val.frequency === 'monthly');
                    });

                    paymentDay.enable();
                    billingTerm.enable();

                } else if (value === 'weekly') {

                    this.billingTerms = _.filter(this.billingTermsList, (val: BillingTerm) => {
                        return (val.frequency === 'all' || val.frequency === 'weekly');
                    });

                    paymentDay.enable();
                    billingTerm.enable();

                } else if (value === 'fortnightly') {

                    this.billingTerms = _.filter(this.billingTermsList, (val: BillingTerm) => {
                        return (val.frequency === 'all' || val.frequency === 'fortnightly');
                    });

                    paymentDay.enable();
                    billingTerm.enable();

                } else if (value === 'custom') {

                    paymentDay.disable();
                    billingTerm.disable();

                }

                this.paymentPlanForm.get('billing_term').patchValue(null, {emitEvent: false});
                this.paymentPlanForm.get('payment_day').patchValue(null, {emitEvent: false});

            });

        this.paymentPlanForm.get('payment_day')
            .valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {

                if (!value) { 
                    return;
                }

                const activatedate = this.paymentPlanForm.get('activation_date');

                activatedate.reset();

                if (activatedate.disabled) {
                    activatedate.enable();
                }

            });


    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();

        this._financeAccountsService.clearPaymentSettingPage();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create form
     */
    createForm(): void {

        this.paymentPlanForm = this._formBuilder.group({
            payment_frequency: new FormControl(null, [Validators.required]),
            payment_day: new FormControl(null, [Validators.required]),
            activation_date: new FormControl(null),
            amount_limit: new FormControl(null),
            fixed_amount: new FormControl(null),
            billing_term: new FormControl(null, [Validators.required]),
            auto_charge: new FormControl(true)
        });

        this.paymentPlanForm.get('billing_term').disable();
        this.paymentPlanForm.get('payment_day').disable();

    }

    setSelectValues(): void {

        this.paymentFrequencies = this._financeService.getPaymentFrequencies();

        const weekdays = moment.weekdays();

        _.remove(weekdays, (day: string) => _.indexOf(['sunday', 'saturday'], _.lowerCase(day)) > -1);

        this.paymentdays = _.map(weekdays, (day) => ({ name: day, value: _.lowerCase(day) }));

        this.billingTermsList = this._financeService.getBillingTermList();

        this.billingTermDescriptionMap = this._financeService.getBillingTermDescriptionMap();

    }

    get fc(): any {
        return this.paymentPlanForm.controls;
    }

    trackByFn(index: number, item: any): string {
        return item.id;
    }

    disabledDate = (current: Date): boolean => {
        // Can not select days before today and today
        return differenceInCalendarDays(current, this.today) <= 0;
    }

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

    /**
   * go back
   *
   * @param {MouseEvent} e
   */
    onBack(e: MouseEvent): void {
        e.preventDefault();
        this._location.back();
    }

    onSubmit(): void {

        if (this.paymentPlanForm.invalid) {
            return;
        }

        const sendObj = {
            payment_frequency: this.fc.payment_frequency.value,
            payment_day: this.fc.payment_day.value,
            activation_date: this.fc.activation_date.value,
            amount_limit: this.fc.amount_limit.value,
            fixed_amount: this.fc.fixed_amount.value,
            billing_term: this.fc.billing_term.value,
            user_id: this.userId,
            next_payment_date: this.nextPaymentDate,
            auto_charge: this.fc.auto_charge.value
        };

        this._logger.debug('[sendObj]', sendObj);

        this.buttonLoading = true;

        this._financeAccountsService.addPaymentPlan(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                this._notification.clearSnackBar();
                
                setTimeout(() => {
                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                    this._financeAccountsService.listPaymentPlans(this.userId);
                    this.nextPaymentDate = null;
                    this.resetForm();
                }, 200);
            });

    }

    changeStatus(event: MouseEvent, id: string, status: string): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm({
                nzTitle: 'Deactivate',
                nzContent: 'This action will deactivate the payment plan. This cannot be reversed. Are you sure you want to deactive this plan?',
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Continue',
                nzOkType: 'primary',
                nzOnOk: () => {
                    return new Promise((resolve, reject) => {

                        this.tableLoader = true;

                        this._financeAccountsService.editPaymentPlan({id: id, status: status})
                            .pipe(
                                takeUntil(this.unsubscribeAll),
                                finalize(() => {
                                    this.tableLoader = false;
                                    resolve();
                                })
                            )
                            .subscribe((response) => {

                                this._notification.clearSnackBar();
                                
                                setTimeout(() => {
                                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                                    this.reloadTable(null);
                                }, 200);
                            });

                    });
                }
            });

    }

    toggleAutoCharge(event: MouseEvent, id: string, autoCharge: boolean): void {

        this.tableLoader = true;

        this._financeAccountsService.editPaymentPlan({id: id, auto_charge: autoCharge})
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.tableLoader = false;
                })
            )
            .subscribe((response) => {

                this._notification.clearSnackBar();
                
                setTimeout(() => {
                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                    this.reloadTable(null);
                }, 200);
            });

    }

    getNextPaymentText(): string {
        return 'Next payment date will be ' + this.nextPaymentDate;
    }

    activationChange(date: any): void {
        this.calculateNextDate();
    }

    calculateNextDate(): void {
        const activationDate = this.paymentPlanForm.get('activation_date');
        const paymentDay = this.paymentPlanForm.get('payment_day');

        if (!activationDate.value && !paymentDay.value) {
            return;
        }
        
        let dayInNeed;
        let today;
        let todayDate;

        dayInNeed = _.indexOf(_.map(this.paymentdays, 'value'), paymentDay.value) + 1;
        
        if (activationDate.value) {
            today = DateTimeHelper.parseMoment(activationDate.value).isoWeekday();
            todayDate = DateTimeHelper.parseMoment(activationDate.value);
        } else {
            today = DateTimeHelper.now().isoWeekday();
            todayDate = DateTimeHelper.now();
        }
        
        // if we haven't yet passed the day of the week that I need:
        if (today < dayInNeed) { 
            // then just give me this week's instance of that day
            this.nextPaymentDate = DateTimeHelper.getUtcDate(todayDate.isoWeekday(dayInNeed));
        } else {
            // otherwise, give me *next week's* instance of that same day
            this.nextPaymentDate = DateTimeHelper.getUtcDate(todayDate.add(1, 'weeks').isoWeekday(dayInNeed));
        }

    }

    deletePlan(event: MouseEvent, id: string): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm({
                nzTitle: AppConst.dialogContent.DELETE.TITLE,
                nzContent: AppConst.dialogContent.DELETE.BODY,
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Continue',
                nzOkType: 'primary',
                nzOnOk: () => {
                    return new Promise((resolve, reject) => {

                        this.tableLoader = true;

                        this._financeAccountsService.deletePaymentPlan({id: id})
                            .pipe(
                                takeUntil(this.unsubscribeAll),
                                finalize(() => {
                                    this.tableLoader = false;
                                    resolve();
                                })
                            )
                            .subscribe((response) => {

                                this._notification.clearSnackBar();
                                
                                setTimeout(() => {
                                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                                    this.reloadTable(null);
                                }, 200);
                            });

                        });
                    }
            });

    }

    resetForm(): void {
        this.paymentPlanForm.reset();
        this.paymentPlanForm.get('billing_term').disable();
        this.paymentPlanForm.get('payment_day').disable();
    }

    reloadTable(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }
        
        this._financeAccountsService.listPaymentPlans(this.userId);
    }

    showDetail(event: MouseEvent, item: FinancePaymentPlan): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(ParentPaymentScheduleDetailDialogComponent,
                {
                    panelClass: 'parent-payment-schedule-detail-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        schedule: item,
                        response: {}
                    }
                });

    }

    edit(event: MouseEvent, item: FinancePaymentPlan): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(ParentPaymentScheduleEditDialogComponent,
                {
                    panelClass: 'parent-payment-schedule-edit-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        schedule: item,
                        response: {}
                    }
                });
        
        this.dialogRef
            .afterClosed()
            .subscribe((message: string) => {

                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => {
                    this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                    this.reloadTable(null);
                }, 200);

            });
    }

}
