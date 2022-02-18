import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { SessionOfCares } from '../../session-subsidy.model';
import { SessionSubsidyService } from '../../services/session-subsidy.service';

@Component({
    selector: 'app-entitlement-details-dialog',
    templateUrl: './entitlement-details-dialog.component.html',
    styleUrls: ['./entitlement-details-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class EntitlementDetailsDialogComponent implements OnInit, OnDestroy {

    entitlementDetail: SessionOfCares;
    dialogRef: any;

    reasonMap: any;

    constructor(
        public matDialogRef: MatDialogRef<EntitlementDetailsDialogComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _matDialog: MatDialog,
        private _sessionSubsidyService: SessionSubsidyService
    ) {

        this.entitlementDetail = this._data.detail;
        this.reasonMap = this._sessionSubsidyService.getReasonMap();

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('[payment_details]', this.entitlementDetail);
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    getReason(reason: any): string {

        if (reason) { 
            return this.reasonMap[reason] ? this.reasonMap[reason] : '';
        } else {
            return '';
        }

    }

    getRecipient(recipient: any): string {

        if (recipient) { 
            return recipient === 'SERVIC' ? 'Service' : (recipient === 'INDIVI' ? 'Individual' : '');
        } else {
            return '';
        }

    }
}
