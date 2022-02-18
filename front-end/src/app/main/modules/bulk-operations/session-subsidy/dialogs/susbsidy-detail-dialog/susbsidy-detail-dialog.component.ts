import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { Subsidy } from '../../session-subsidy.model';
import { EntitlementDetailsDialogComponent } from '../entitlement-details-dialog/entitlement-details-dialog.component';

@Component({
    selector: 'app-susbsidy-detail-dialog',
    templateUrl: './susbsidy-detail-dialog.component.html',
    styleUrls: ['./susbsidy-detail-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class SusbsidyDetailDialogComponent implements OnInit, OnDestroy {

    subsidyDetail: Subsidy;
    dialogRef: any;

    constructor(
        public matDialogRef: MatDialogRef<SusbsidyDetailDialogComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _matDialog: MatDialog,
    ) {

        this.subsidyDetail = this._data.detail;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('[payment_details]', this.subsidyDetail);
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    openDetail(event: MouseEvent, data: any): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(EntitlementDetailsDialogComponent,
                {
                    panelClass: 'ccs-entitlement-details-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                        detail: data
                    }
                });

    }

}
