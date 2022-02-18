import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { User } from 'app/main/modules/user/user.model';
import { fadeMotion, helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { FinanceService } from '../../services/finance.service';
import * as _ from 'lodash';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { finalize, takeUntil } from 'rxjs/operators';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-bulk-toggle-auto-charge-dialog',
    templateUrl: './bulk-toggle-auto-charge-dialog.component.html',
    styleUrls: ['./bulk-toggle-auto-charge-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkToggleAutoChargeDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    autoChargeForm: FormGroup;
    buttonLoading: boolean;
    parents: User[];
    preSelectedParents: any;

    constructor(
        public matDialogRef: MatDialogRef<BulkToggleAutoChargeDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _financialService: FinanceService,
        private _notification: NotificationService,
    ) {

        this.unsubscribeAll = new Subject();
        this.parents = this._data.parents ? this._data.parents : [];
        this.preSelectedParents = this._data.selected_parents ? this._data.selected_parents : [];
        this.buttonLoading = false;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('[bulk-auto-charge-toggle]');

        this.createForm();

        this.setPreselecteParents();

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

        this.autoChargeForm = this._formBuilder.group({
            auto_charge: new FormControl(true),
            parents: new FormControl(null, [Validators.required]),
        });

    }

    get fc(): any {
        return this.autoChargeForm.controls;
    }

    setPreselecteParents(): void {

        if (_.isArray(this.preSelectedParents) && this.preSelectedParents.length > 0) {
            this.autoChargeForm.get('parents').patchValue(this.preSelectedParents);
        }

    }

    submit(event: MouseEvent): void {

        event.preventDefault();

        if (this.autoChargeForm.invalid) {
            return;
        }

        this.buttonLoading = true;

        const sendObj = {
            parents: this.fc.parents.value,
            auto_charge: this.fc.auto_charge.value
        };

        this._financialService.bulkAutoChargeToggle(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                if (response) {
                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                }

                setTimeout(() => this.matDialogRef.close(response), 250);

            });

    }

    toggleSelectAllParents(value: boolean): void {

        if (value === true) {
            this.autoChargeForm.get('parents').patchValue(_.map(this.parents, 'id'), { emitEvent: false });
        } else {
            this.autoChargeForm.get('parents').patchValue([], { emitEvent: false });
        }

    }

}
