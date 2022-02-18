import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/operators';
import { PettyCashPrintViewComponent } from './dialog/petty-cash-print-view/petty-cash-print-view.component';
import { CategoryService } from './services/category.service';
import { SupplierService } from './services/supplier.service';

@Component({
    selector: 'petty-cash',
    templateUrl: './petty-cash.component.html',
    styleUrls: ['./petty-cash.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PettyCashComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    current: number;
    dialogRef: any;

    constructor(
        private _categoryService: CategoryService,
        private _supplierService: SupplierService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
    ) {
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false

    }

    ngOnInit() {

    }

    ngOnDestroy(): void {

        this._supplierService.unsubscribeOptions();
        this._categoryService.unsubscribeOptions();

        this._supplierService.unsubscribeOptions();
        this._supplierService.unsubscribeOptions();


        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    updatePosition(index: number): void {
        this.current = index;
    }

    /**
   * tab navigation previous
   */
    pre(): void {
        this.current -= 1;
    }

    /**
     * tab navigation new
     */
    next(): void {
        this.current += 1;
    }

    print(e: MouseEvent): void
    {
        e.preventDefault();
        this.buttonLoader = true;
        setTimeout(() => this.buttonLoader = false, 500);
        this.dialogRef = this._matDialog
            .open(PettyCashPrintViewComponent,
                {
                    panelClass: 'petty-cash-print',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                    }
                });
        setTimeout(() => this.buttonLoader = false, 500);
        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message => {
                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }
}
