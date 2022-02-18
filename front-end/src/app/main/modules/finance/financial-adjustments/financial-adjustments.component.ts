import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { FinancialAdjustmentsService } from './services/financial-adjustments.service';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { FinanceService } from '../shared/services/finance.service';
import { AddFinancialAdjustmentDialogComponent } from '../shared/dialogs/add-financial-adjustment-dialog/add-financial-adjustment-dialog.component';

@Component({
    selector: 'app-financial-adjustments',
    templateUrl: './financial-adjustments.component.html',
    styleUrls: ['./financial-adjustments.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialAdjustmentsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    dialogRef: any;
    infoMessage: string;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        private _commonService: CommonService,
        private _financialAdjustmentsService: FinancialAdjustmentsService,
        private _financeService: FinanceService,
        private _matDialog: MatDialog,
        private _notification: NotificationService
    ) {
        this._unsubscribeAll = new Subject();
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.infoMessage = `The Financial Adjustments section should be used for managing any fees other than booking fees. Some examples include birthday cake fees, excursion fees, admin fees, late pick up fees etc.`;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._financialAdjustmentsService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.triggerResize();
    }

    openAddDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        const resObservable = forkJoin([
            this._financeService.getRoomList(),
            this._financeService.getAdjustmentListItems()
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe(([rooms, items]) => {

                this.dialogRef = this._matDialog
                    .open(AddFinancialAdjustmentDialogComponent,
                        {
                            panelClass: 'add-financial-adjustment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                rooms: rooms,
                                items: items,
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
                            this._financialAdjustmentsService.listFinancialAdjustments();
                        }, 200);

                    });
            });


    }
}
