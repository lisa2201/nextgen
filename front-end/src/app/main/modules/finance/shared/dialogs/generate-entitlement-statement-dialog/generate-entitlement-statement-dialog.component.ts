import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FinanceService } from '../../services/finance.service';
import { Child } from 'app/main/modules/child/child.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NGXLogger } from 'ngx-logger';
import { takeUntil, finalize, flatMap } from 'rxjs/operators';
import { User } from 'app/main/modules/user/user.model';

@Component({
    selector: 'app-generate-entitlement-statement-dialog',
    templateUrl: './generate-entitlement-statement-dialog.component.html',
    styleUrls: ['./generate-entitlement-statement-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class GenerateEntitlementStatementDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    entitlementStatementForm: FormGroup;
    buttonLoading: boolean;
    singleParentMode: boolean;

    parentList: User[] | null;
    userId: string | null;
    children: Child[];

    constructor(
        public matDialogRef: MatDialogRef<GenerateEntitlementStatementDialogComponent>,
        private _formBuilder: FormBuilder,
        private _logger: NGXLogger,
        private _financeService: FinanceService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.singleParentMode = this._data.singleParent ? true : false;
        this.userId = this._data.user_id ? this._data.user_id : null;
        this.children = this._data.children ? this._data.children : [];
        this.parentList = this._data.parents ? this._data.parents : [];

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

        this.entitlementStatementForm = this._formBuilder.group({
            user: new FormControl(null, [Validators.required]),
            child: new FormControl(null, [Validators.required]),
            start_date: new FormControl(null, [Validators.required]),
            end_date: new FormControl(null, [Validators.required])
        });

        const userControl = this.entitlementStatementForm.get('user');

        if (this.singleParentMode) {
            userControl.disable();
        } else {

            userControl.valueChanges
                .pipe(
                    takeUntil(this.unsubscribeAll)
                )
                .subscribe((value: string) => {
                    this.loadChildren(value);
                });

        }

    }

    get fc(): any {
        return this.entitlementStatementForm.controls;
    }

    loadChildren(value: string): void {

        const childControl = this.entitlementStatementForm.get('child');

        childControl.disable();

        this._financeService.getEntitlementGenerationDependency(value)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    childControl.enable();
                    childControl.reset();
                })
            )
            .subscribe((children) => {
                this.children = children;
            });

    }

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.entitlementStatementForm.invalid) {
            return;
        }

        const sendObj = {
            child_id: this.fc.child.value,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value)
        };

        this._logger.debug('Send data', sendObj);
        this.buttonLoading = true;

        this._financeService.generateStatementEntitlement(sendObj)
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
}
