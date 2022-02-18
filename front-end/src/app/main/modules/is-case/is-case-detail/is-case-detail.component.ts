import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { IsCaseService } from '../services/is-case.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { Location } from '@angular/common';
import { NGXLogger } from 'ngx-logger';
import { ISCase } from '../is-case.model';
import { CreateIsClaimDialogComponent } from '../dialogs/create-is-claim-dialog/create-is-claim-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import * as _ from 'lodash';
import { Router } from '@angular/router';

@Component({
    selector: 'app-is-case-detail',
    templateUrl: './is-case-detail.component.html',
    styleUrls: ['./is-case-detail.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseDetailComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;

    isCase: ISCase;
    carers: [];
    days: [];
    careHours: [];
    supportHours: [];
    isEnrolments: [];
    dialogRef: any;

    constructor(
        private _isCaseService: IsCaseService,
        private _location: Location,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _router: Router
    ) {
        this._unsubscribeAll = new Subject();

        this.carers = [];
        this.days = [];
        this.careHours = [];
        this.supportHours = [];
        this.isEnrolments = [];
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._isCaseService.onISCaseDetailChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {

                this.isCase = response;

                this._logger.debug('[IS Case]', this.isCase);

                this.carers = response.ListOfCarers && response.ListOfCarers.Carer ? response.ListOfCarers.Carer : [];
                this.days = response.ListOfDays && response.ListOfDays.Day ? response.ListOfDays.Day : [];
                this.careHours = response.ListOfCareHours && response.ListOfCareHours.CareHours ? response.ListOfCareHours.CareHours : [];
                this.supportHours = response.ListOfSupportHours && response.ListOfSupportHours.SupportHours ? response.ListOfSupportHours.SupportHours : [];
                this.isEnrolments = response.ListOfISEnrolments && response.ListOfISEnrolments.ISEnrolment ? response.ListOfISEnrolments.ISEnrolment : [];

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

    goToClaims(event: MouseEvent): void {
        event.preventDefault();
        this._router.navigate(['/inclusion-support', 'claims'], { queryParams: {caseId: this.isCase.ISCaseId} });
    }

    openAddISClaimDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        const resObservable = forkJoin([
            this._isCaseService.addISCaseClaimDependency(this.isCase)
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe(([depData]) => {

                this._logger.debug('[Dependency Data]', depData);

                this.dialogRef = this._matDialog
                    .open(CreateIsClaimDialogComponent,
                        {
                            panelClass: 'create-is-claim-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                isCase: this.isCase,
                                children: depData.children ? depData.children : [],
                                educators: depData.educators ? depData.educators : [],
                                edit: false,
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
                        }, 200);

                    });
                
            });

    }

}
