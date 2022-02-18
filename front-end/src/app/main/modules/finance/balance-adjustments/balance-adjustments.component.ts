import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { BalanceAdjustmentsService } from './services/balance-adjustments.service';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AddBalanceAdjustmentDialogComponent } from './dialogs/add-balance-adjustment-dialog/add-balance-adjustment-dialog.component';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { FinanceService } from '../shared/services/finance.service';


@Component({
    selector: 'app-balance-adjustments',
    templateUrl: './balance-adjustments.component.html',
    styleUrls: ['./balance-adjustments.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BalanceAdjustmentsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    dialogRef: any;
    infoMessage: string;
    warnMessage: string;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    
    /**
     * constructor
     * @param {CommonService} _commonService 
     * @param {BalanceAdjustmentsService} _balanceAdjustmentsService 
     * @param {MatDialog} _matDialog 
     * @param {NotificationService} _notification 
     */
    constructor(
        private _commonService: CommonService,
        private _balanceAdjustmentsService: BalanceAdjustmentsService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _financeService: FinanceService
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

        this.infoMessage = `The opening balance section should only be used for transfer of any balances from previous software provider. Please note that balance adjustments cannot be deleted from statements and it is recommended to add balance adjustment only once.`;
        this.warnMessage = `This will reset the running balance of the account to the value entered. Please proceed with caution.`;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._balanceAdjustmentsService.unsubscribeOptions();
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
            this._balanceAdjustmentsService.getParentList()
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe(([parent]) => {

                this.dialogRef = this._matDialog
                    .open(AddBalanceAdjustmentDialogComponent,
                        {
                            panelClass: 'add-balance-adjustment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                //   rooms: rooms,
                                //   items: items,
                                parent: parent,
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
                            this._balanceAdjustmentsService.listBalanceAdjustments();
                        }, 200);

                    });
            });


    }
}
