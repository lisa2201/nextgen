import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { takeUntil, finalize } from 'rxjs/operators';
import { FinanceService } from '../../services/finance.service';
import * as moment from 'moment';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-generate-parent-statement-dialog',
    templateUrl: './generate-parent-statement-dialog.component.html',
    styleUrls: ['./generate-parent-statement-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class GenerateParentStatementDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    PREVIEW = 'preview';
    EMAIL = 'email';
    DOWNLOAD_PDF = 'download_pdf';

    generateParentStatementForm: FormGroup;
    buttonLoading: boolean;
    downloadPDFLoading: boolean;
    sendEmailLoading: boolean;


    userId: string | null;

    constructor(
        public matDialogRef: MatDialogRef<GenerateParentStatementDialogComponent>,
        private _formBuilder: FormBuilder,
        private _financeService: FinanceService,
        private _notification: NotificationService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.userId = this._data.user_id ? this._data.user_id : null;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.createForm();

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

    /**
     * Create form
     */
    createForm(): void {

        this.generateParentStatementForm = this._formBuilder.group({
            start_date: new FormControl(null, [Validators.required]),
            end_date: new FormControl(null, [Validators.required]),
            payment_date: new FormControl(null)
        });

    }

    get fc(): any {
        return this.generateParentStatementForm.controls;
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

    downloadPdf(event: MouseEvent): void {

        if (this.generateParentStatementForm.invalid) {
            return;
        }

        // tslint:disable-next-line: curly
        if (!this.validDateRange()) return;

        const sendObj = {
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            payment_date: this.fc.payment_date.value,
            id: this.userId
        };

        this.buttonLoading = true;

        this._financeService.parentStatementPdfDownload(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {
                window.open(response);
                setTimeout(() => this.matDialogRef.close(response), 250);
            });

    }

    sendStatement(event: MouseEvent): void {

        event.preventDefault();

        // tslint:disable-next-line: curly
        if (!this.validDateRange()) return;

        const sendData = {
            id: [this.userId],
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            payment_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value)
        };

        this.sendEmailLoading = true;

        this._financeService.parentStatementEmail(sendData)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.sendEmailLoading = false;
                })
            )
            .subscribe((response) => {
                this._notification.clearSnackBar();
                setTimeout(() => {
                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                    this.matDialogRef.close(response);
                }, 200);
            });

    }

}
