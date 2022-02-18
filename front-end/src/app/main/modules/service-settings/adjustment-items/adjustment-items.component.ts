import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { AddAdjustmentItemsDialogComponent } from './dialogs/add-adjustment-items-dialog/add-adjustment-items-dialog.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AdjustmentItemsService } from './services/adjustment-items.service';

@Component({
    selector: 'app-adjustment-items',
    templateUrl: './adjustment-items.component.html',
    styleUrls: ['./adjustment-items.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AdjustmentItemsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    dialogRef: any;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
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
        private _matDialog: MatDialog,
        private _adjustmentItemsService: AdjustmentItemsService,
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

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // this._balanceAdjustmentsService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

    openAddDialog(event: MouseEvent): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(AddAdjustmentItemsDialogComponent,
                {
                    panelClass: 'add-adjustment-item-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        item: null,
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
                    this._adjustmentItemsService.listAdjustmentItems();
                }, 200);

            });


    }

}
