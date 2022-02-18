import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { ISCaseClaim, AdditionalEducator, Payment, Enrolement } from '../is-case-claim.model';
import { IsCaseService } from '../services/is-case.service';
import { Location } from '@angular/common';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { MatDialog } from '@angular/material/dialog';
import { IsClaimPaymentDetailDialogComponent } from '../dialogs/is-claim-payment-detail-dialog/is-claim-payment-detail-dialog.component';
import { Router } from '@angular/router';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-is-case-claim-detail',
    templateUrl: './is-case-claim-detail.component.html',
    styleUrls: ['./is-case-claim-detail.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseClaimDetailComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;

    isCaseClaim: ISCaseClaim;
    additionalEducators: AdditionalEducator[];
    payments: Payment[];
    enrolments: Enrolement[];

    dialogRef: any;
    confirmModal: NzModalRef;

    constructor(
        private _isCaseService: IsCaseService,
        private _location: Location,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _router: Router
    ) {
        this._unsubscribeAll = new Subject();

        this.additionalEducators = [];
        this.payments = [];
        this.enrolments = [];

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._isCaseService.onISCaseClaimsDetailChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response: ISCaseClaim) => {

                this.isCaseClaim = response;

                this._logger.debug('[IS Case]', this.isCaseClaim);

                this.additionalEducators = response.ListOfAdditionalEducators && response.ListOfAdditionalEducators.AdditionalEducators ? response.ListOfAdditionalEducators.AdditionalEducators : [];
                this.enrolments = response.ListOfEnrolments && response.ListOfEnrolments.Enrolment ? response.ListOfEnrolments.Enrolment : [];
                this.payments = response.ListOfPayments && response.ListOfPayments.Payment ? response.ListOfPayments.Payment : [];

            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        if (this._router.routerState.snapshot.url.includes('inclusion-support') === false) {
            this._logger.debug('Clear IS Case Service Data');
            this._isCaseService.unsubscribeOptions();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------


    onBack(e: MouseEvent): void {
        e.preventDefault();
        this._location.back();
    }

    getCreatedByDetail(): string {
        return `${this.isCaseClaim.CreateAuthorisedPersonFirstName} ${this.isCaseClaim.CreateAuthorisedPersonLastName} (${this.isCaseClaim.CreateAuthorisedPersonId})`;
    }

    getCancelledByDetail(): string {
        return `${this.isCaseClaim.CancelAuthorisedPersonFirstName} ${this.isCaseClaim.CancelAuthorisedPersonLastName} (${this.isCaseClaim.CancelAuthorisedPersonId})`;
    }

    cancelClaim(event: MouseEvent): void {

        event.preventDefault();

        const sendData = {
            case_id: this.isCaseClaim.ISCaseId,
            claim_id: this.isCaseClaim.ISCaseClaimId
        };

        this.confirmModal = this._modalService.confirm({
            nzTitle: 'Are you sure want to cancel this claim?',
            nzContent: 'You are about to cancel this claim. This operation can not be undone. Would you like to proceed?',
            nzWrapClassName: 'vertical-center-modal',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => {
                return new Promise((resolve, reject) => {

                    this._isCaseService
                        .cancelISCaseClaim(sendData)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            message => {
                                setTimeout(() => {

                                    this._notification.displaySnackBar(
                                        message,
                                        NotifyType.SUCCESS
                                    );

                                    this.isCaseClaim.ISCaseClaimStatus = 'Cancelled';

                                }, 200);
                            },
                            error => {
                                throw error;
                            }
                        );
                });
            }
        });

    }

    paymentDetailDialog(event: MouseEvent, index: number): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(IsClaimPaymentDetailDialogComponent,
                {
                    panelClass: 'is-claim-payment-detail-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        payment: this.payments[index],
                        response: {}
                    }
                });

    }

}
