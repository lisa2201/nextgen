import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import {
    fadeInOnEnterAnimation,
    fadeOutOnLeaveAnimation
} from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { CommonService } from 'app/shared/service/common.service';
import { NewOrEditComponent } from './dialog/new-or-edit/new-or-edit.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { CcsSetupService } from './ccs-setup.service';

@Component({
    selector: 'app-ccs-setup',
    templateUrl: './ccs-setup.component.html',
    styleUrls: ['./ccs-setup.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CcsSetupComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    dialogRef: any;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _commonService: CommonService,
        private _ccsSetupService: CcsSetupService
    ) {
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this._logger.debug('ccs !!!');

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._ccsSetupService.unsubscribeOptions();
    }

    addDialog(e: MouseEvent): void {

        e.preventDefault();

        this.dialogRef = this._matDialog.open(NewOrEditComponent, {
            panelClass: 'ccs-new-dialog',
            closeOnNavigation: true,
            disableClose: true,
            autoFocus: false,
            data: {
                action: AppConst.modalActionTypes.NEW
            }
        });

        this.dialogRef.afterClosed().subscribe(message => {
            if (!message) {
                return;
            }

            this._notification.clearSnackBar();

            setTimeout(
                () =>
                    this._notification.displaySnackBar(
                        message,
                        NotifyType.SUCCESS
                    ),
                200
            );
        });

    }

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

}
