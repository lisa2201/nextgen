import { Component, OnInit, ViewChild, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonService } from 'app/shared/service/common.service';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NewOrEditBondPaymentComponent } from './dialog/new-or-edit-bond-payment/new-or-edit-bond-payment.component';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs/internal/Subject';
import { User } from '../../user/user.model';
import { Child } from '../../child/child.model';
import { UsersService } from '../../user/services/users.service';
import { BondPaymentservice } from './service/bond-payment.service';
import { ChildrenService } from '../../child/services/children.service';

@Component({
    selector: 'app-bond-payment',
    templateUrl: './bond-payment.component.html',
    styleUrls: ['./bond-payment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BondPaymentComponent implements OnInit, OnDestroy {

    buttonLoader: boolean;
    dialogRef: any;
    private _unsubscribeAll: Subject<any>;
    infoMessage: string;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        private _commonService: CommonService,
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _bonPaymentService: BondPaymentservice,
    ) {

        this.buttonLoader = false;
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        this.infoMessage = `Bond payments taken from parents can be recorded in KinderPay. Bond payments recorded here are recorded separate to the financial statement and not included part of account balance.`;
        
    }

    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

    addDialog(e: MouseEvent): void {
        e.preventDefault();

        this.buttonLoader = true;
        Promise.all([
            this._bonPaymentService.getUsers(),
        ])
        .then(([user]: [User[]]) => 
        {
            setTimeout(() => this.buttonLoader = false, 200);
            console.log('[user-list]', user);

        setTimeout(() => this.buttonLoader = false, 200);
        this.dialogRef = this._matDialog
            .open(NewOrEditBondPaymentComponent,
                {
                    panelClass: 'new-or-edit-bond-payment',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            user: user,
                        }
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message => {
                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                // update view
                // this.tableContentView.onTableChange(true);
            });
        });
    }

    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
