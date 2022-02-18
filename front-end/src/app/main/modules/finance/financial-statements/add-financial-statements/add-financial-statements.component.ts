import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import * as _ from 'lodash';
import { Location } from '@angular/common';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { CommonService } from 'app/shared/service/common.service';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { TransferItem, TransferChange } from 'ng-zorro-antd';
import { User } from 'app/main/modules/user/user.model';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { FinancialStatementsService } from '../services/financial-statements.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { AddFinancialStatementListItem } from '../model/add-financial-statement-list-item.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as moment from 'moment';
import { FinanceService } from '../../shared/services/finance.service';
import { MatDialog } from '@angular/material/dialog';
import { ParentStatementPreviewViewComponent } from '../../shared/dialogs/parent-statement-preview-view/parent-statement-preview-view.component';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

@Component({
    selector: 'app-add-financial-statements',
    templateUrl: './add-financial-statements.component.html',
    styleUrls: ['./add-financial-statements.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddFinancialStatementsComponent implements OnInit, OnDestroy {

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    private unsubscribeAll: Subject<any>;

    statementForm: FormGroup;
    buttonLoading: boolean;
    buttonDone: boolean;
    parents: User[];
    transferList: TransferItem[];
    selectedParents: AddFinancialStatementListItem[];

    dialogRef: any;

    constructor(
        private _location: Location,
        private _commonService: CommonService,
        private _formBuilder: FormBuilder,
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
        private _financialStatementsService: FinancialStatementsService,
        private _financeService: FinanceService,
        private _route: ActivatedRoute,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _fuseSidebarService: FuseSidebarService
    ) {
        this.unsubscribeAll = new Subject();
        this.parents = [];
        this.buttonLoading = false;
        this.buttonDone = false;
        this.transferList = [];
        this.selectedParents = [];
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.createForm();

        this._financialStatementsService.onUsersChanged
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((users: User[]) => {

                this.selectedParents = [];
                this.transferList = [];
                this.parents = users;

                this.parents.forEach((value, index) => {
        
                    const childNames = value.children ? _.join(_.map(value.children, (child: any) => child.f_name), ', ') : [];
        
                    this.transferList.push({
                        key: index.toString(),
                        title: `${value.getFullName()} ${_.isEmpty(childNames) ? '' : '(' + childNames + ')'}`,
                        disabled: false,
                        id: value.id
                    });
                });

            });

    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();

        this._financialStatementsService.addPageUnsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create form
     */
    createForm(): void {

        this.statementForm = this._formBuilder.group({
            start_date: new FormControl('', [Validators.required]),
            end_date: new FormControl('', Validators.required),
            payment_date: new FormControl('')
        });

    }

    get fc(): any {
        return this.statementForm.controls;
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    change(obj: TransferChange): void {

        // Add
        if (obj.from === 'left' && obj.to === 'right') {
            this.selectedParents = _.concat(this.selectedParents, _.map(obj.list, (i, idx) => new AddFinancialStatementListItem(i, idx)));
            this.buttonDone = false;
        }

        // Remove
        if (obj.from === 'right' && obj.to === 'left') {
            _.pullAllBy(this.selectedParents, obj.list, 'id');
        }

    }

    trackByFn(index: number, item: AddFinancialStatementListItem): string {
        return item.id;
    }

    disabledStartDate(currentDate: Date): boolean {
        return currentDate.getDay() === 1 ? false : true;
    }

    disabledEndDate(currentDate: Date): boolean {
        return currentDate.getDay() === 0 ? false : true;
    }

    showPreview(event: MouseEvent, id: string, index: number): void {

        event.preventDefault();

        // tslint:disable-next-line: curly
        if (!this.validDateRange()) return;

        this.selectedParents[index].loadPreview(true);

        const sendData = {
            id: id,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            payment_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value)
        };

        this._financeService.getStatementPreviewData(sendData)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.selectedParents[index].loadPreview(false);
                })
            )
            .subscribe((response) => {
                this.openStatementViewDialog(response);
            });

    }

    openStatementViewDialog(data: any): void {

        this.dialogRef = this._matDialog
            .open(ParentStatementPreviewViewComponent,
                {
                    panelClass: 'parent-statement-preview-view',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        loaded_data: data,
                        start_date: this.fc.start_date.value,
                        end_date: this.fc.end_date.value,
                        payment_date: this.fc.payment_date.value,
                        response: {}
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe(() => {

                this._logger.debug('Dialog closed');

            });

    }

    downloadPdf(event: MouseEvent, id: string, index: number): void {

        event.preventDefault();

        // tslint:disable-next-line: curly
        if (!this.validDateRange()) return;

        this.selectedParents[index].loadDownload(true);

        const sendData = {
            id: id,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            payment_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value)
        };

        this._financeService.parentStatementPdfDownload(sendData)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.selectedParents[index].loadDownload(false);
                })
            )
            .subscribe((response) => {
                window.open(response);
            });

    }

    sendStatement(event: MouseEvent, id: string, index: number): void {

        event.preventDefault();

        // tslint:disable-next-line: curly
        if (!this.validDateRange()) return;

        const sendData = {
            id: [id],
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            payment_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value)
        };

        this.selectedParents[index].loadSend(true);

        this._financeService.parentStatementEmail(sendData)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.selectedParents[index].loadSend(false);
                })
            )
            .subscribe((response) => {
                this._notification.clearSnackBar();
                this.selectedParents[index].setSendStatus(true);
                setTimeout(() => this._notification.displaySnackBar(response, NotifyType.SUCCESS), 200);
            });

    }

    sendAll(event: MouseEvent): void {

        event.preventDefault();

        // tslint:disable-next-line: curly
        if (!this.validDateRange()) return;

        const sendIds = _.filter(this.selectedParents, { sendDone: false });

        if (sendIds.length === 0) {
            this._notification.displaySnackBar('All statements are already emailed', NotifyType.INFO);
            this.buttonDone = true;
            return;
        }

        const sendData = {
            id: _.map(sendIds, 'id'),
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            payment_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value)
        };


        this._financeService.parentStatementEmail(sendData)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                _.forEach(sendIds, (value, index) => {
                    value.setSendStatus(true);
                });

                this.buttonDone = true;

                this._notification.clearSnackBar();
                setTimeout(() => this._notification.displaySnackBar(response, NotifyType.SUCCESS), 200);
            });


        this.buttonLoading = true;

        setTimeout(() => {
            this.buttonLoading = false;
            this.buttonDone = true;
        }, 3000);

    }

    validDateRange(): boolean {

        const start = moment(DateTimeHelper.getUtcDate(this.fc.start_date.value), 'YYYY-MM-DD');
        const end = moment(DateTimeHelper.getUtcDate(this.fc.end_date.value), 'YYYY-MM-DD');

        if (start.isAfter(end)) {
            this._notification.displaySnackBar('Please select valid date range', NotifyType.ERROR);
            return false;
        } else {
            return true;
        }

    }

    filterOption(inputValue: string, item: any): boolean {
        return (_.includes(_.toLower(item.title), _.toLower(inputValue)));
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

}
