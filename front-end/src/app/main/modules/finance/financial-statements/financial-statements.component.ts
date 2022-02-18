import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { FinancialStatementsService } from './services/financial-statements.service';
import { CommonService } from 'app/shared/service/common.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanceService } from '../shared/services/finance.service';
import { GenerateEntitlementStatementDialogComponent } from '../shared/dialogs/generate-entitlement-statement-dialog/generate-entitlement-statement-dialog.component';
import { AuthService } from 'app/shared/service/auth.service';
import { GenerateParentStatementDialogComponent } from '../shared/dialogs/generate-parent-statement-dialog/generate-parent-statement-dialog.component';

@Component({
    selector: 'app-financial-statements',
    templateUrl: './financial-statements.component.html',
    styleUrls: ['./financial-statements.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialStatementsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    buttonLoader: boolean;
    dialogRef: any;
    parentLevel: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * @param {CommonService} _commonService 
     * @param {InvoicesService} _invoiceService 
     */
    constructor(
        private _commonService: CommonService,
        private _financialStatementsService: FinancialStatementsService,
        private _financeService: FinanceService,
        private _matDialog: MatDialog,
        private _authService: AuthService,
        private _notification: NotificationService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
        this.parentLevel = this._authService.isParent();
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

        this._financialStatementsService.unsubscribeOptions();
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

    openEntitlementStatementGenerationDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        let resObservable;

        if (this.parentLevel) {
            resObservable = forkJoin([
                this._financeService.getEntitlementGenerationDependency(null)
            ]);
        } else {
            resObservable = forkJoin([
                this._financeService.getParentList()
            ]);
        }

        resObservable
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe(([data]) => {

                this.dialogRef = this._matDialog
                    .open(GenerateEntitlementStatementDialogComponent,
                        {
                            panelClass: 'generate-entitlement-statement-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                response: {},
                                singleParent: this.parentLevel ? true : false,
                                user_id: null,
                                children: this.parentLevel ? data : [],
                                parents: this.parentLevel ? [] : data
                            }
                        });

                this.dialogRef
                    .afterClosed()
                    .subscribe((message: string) => {

                        if (!message) {
                            return;
                        }

                    });
            });


    }

    openParentStatementGenerateDialog(): void {

        this.dialogRef = this._matDialog
            .open(GenerateParentStatementDialogComponent,
                {
                    panelClass: 'generate-parent-statement-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((message: string) => {

                if (!message) {
                    return;
                }

            });

    }

    handleParentStatement(event: MouseEvent): void {

        event.preventDefault();

        if (this.parentLevel) {
            this.openParentStatementGenerateDialog();
        } else {
            this._router.navigate(['generate-statement'], {relativeTo: this._route});
        }

    }

}
