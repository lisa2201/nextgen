import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { AddParentFinancialExclusionDialogComponent } from '../../../shared/dialogs/add-parent-financial-exclusion-dialog/add-parent-financial-exclusion-dialog.component';
import { FinanceAccountsService } from '../../services/finance-accounts.service';
import { FinanceParentExclusion } from './finance-parent-exclusion.model';

@Component({
    selector: 'app-finance-parent-exclusions-settings',
    templateUrl: './finance-parent-exclusions-settings.component.html',
    styleUrls: ['./finance-parent-exclusions-settings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceParentExclusionsSettingsComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    exclusionsLoader: boolean;
    exclusionList: FinanceParentExclusion[];
    dialogRef: any;

    confirmModal: NzModalRef;

    @Input() userId: string;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _financeAccountService: FinanceAccountsService,
        private _modalService: NzModalService
    ) {
        
        this.unsubscribeAll = new Subject();

        this.exclusionsLoader = false;

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
    */
    ngOnInit(): void {

        this._financeAccountService.onFinanceParentExclusionsChanged
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((data) => {
                this.exclusionList = data;
                this._logger.debug('[Exclusion List]', this.exclusionList);
            });

        this._financeAccountService.onExclusionLoaderChanged
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {
                this.exclusionsLoader = value;
            });

    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    openAddExclusionDialog(event: MouseEvent): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(AddParentFinancialExclusionDialogComponent,
                {
                    panelClass: 'add-parent-financial-exclusion-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        user_id: this.userId,
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
                    this.reloadTable(null);
                }, 200);

            });


    }

    reloadTable(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        this._financeAccountService.listParentFinanceExlusions(this.userId);

    }

    deleteExclusion(event: MouseEvent, id: string): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm({
                nzTitle: AppConst.dialogContent.DELETE.TITLE,
                nzContent: AppConst.dialogContent.DELETE.BODY,
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Continue',
                nzOkType: 'primary',
                nzOnOk: () => {
                    return new Promise((resolve, reject) => {

                        this._financeAccountService.deleteParentFinanceExclusion({id: id})
                            .pipe(
                                takeUntil(this.unsubscribeAll),
                                finalize(() => {
                                    resolve();
                                })
                            )
                            .subscribe(
                                (message: string) => {
                                    setTimeout(() => {
                                        this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                                        this.reloadTable(null);
                                    }, 200);
                                },
                                (error) => {
                                    throw error;
                                });

                    });
                }
            });

    }

}
