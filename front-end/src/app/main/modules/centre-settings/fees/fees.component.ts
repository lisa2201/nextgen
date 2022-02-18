import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/internal/Subject';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { FeesService } from './service/fees.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { FeeNewOrEditComponent } from './dialog/fee-new-or-edit/fee-new-or-edit.component';
import { FeesListViewComponent } from './list-view/list-view.component';

@Component({
    selector: 'app-fees',
    templateUrl: './fees.component.html',
    styleUrls: ['./fees.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FeesComponent implements OnInit, OnDestroy {
    
    // Private
    private _unsubscribeAll: Subject<any>;
    
    dialogRef: any;
    buttonLoader: boolean;

    @ViewChild(FeesListViewComponent)
    listComponent: FeesListViewComponent;

    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _feeService: FeesService
    ) 
    {
        // set default values
        this.buttonLoader = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('fees !!!');
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    get listViewLoading(): boolean
    {
        return (typeof this.listComponent !== 'undefined') ? this.listComponent.tableLoading : false;
    }

    addDialog(e: MouseEvent): void 
    {
        e.preventDefault();

        if (this.buttonLoader || this.listViewLoading)
        {
            return;
        }

        this.buttonLoader = true;

        this._feeService
            .getDependency()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    this.dialogRef = this._matDialog
                        .open(FeeNewOrEditComponent,
                        {
                            panelClass: 'fee-new-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                rooms: response
                            }
                        });
                        
                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(message =>
                        {   
                            if ( !message )
                            {
                                return;
                            }

                            this._notification.clearSnackBar();
            
                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error =>
                {
                    throw error;
                }
            );
    }
}
