import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { MatDialog } from '@angular/material/dialog';

import { OrganizationService } from './services/organization.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NewOrEditComponent } from './dialogs/new-or-edit/new-or-edit.component';
import { ListViewComponent } from './list-view/list-view.component';
import { NotificationService } from 'app/shared/service/notification.service';

@Component({
    selector: 'app-organization',
    templateUrl: './organization.component.html',
    styleUrls: ['./organization.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})


export class OrganizationComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    buttonLoader: boolean;
    dialogRef: any;

    @ViewChild(ListViewComponent)
    tableContentView: ListViewComponent;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;


    /**
     * 
     * @param {NGXLogger} _logger 
     * @param {MatDialog} _matDialog 
     * @param {OrganizationService} _organizationService 
     * @param {NotificationService} _notification 
     */
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _organizationService: OrganizationService,
        private _notification: NotificationService
    ) {

        // set default values
        this.buttonLoader = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }


    /**
     * On Init
     */
    ngOnInit(): void {
        this._logger.debug('Organization !!!');
    }

    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        // Close all dialogs
        this._matDialog.closeAll();

        //
        this._organizationService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    /**
     * Add dialog
     * @param {MouseEvent} e 
     */
    addDialog(e: MouseEvent): void {
        e.preventDefault();

        this.buttonLoader = true;

        this._organizationService
            .getDependency()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response => {
                    if (_.isEmpty(response)) { return; }

                    this.dialogRef = this._matDialog
                        .open(NewOrEditComponent,
                            {
                                panelClass: 'org-new-or-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        depends: response
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
                            this.tableContentView.onTableChange(true);
                        });
                }
            );
    }


    /**
     * Update Scroll
     * @param {number} speed 
     */
    updateScroll(speed?: number): void {
        speed = speed || 400;

        if (this.directiveScroll) {
            setTimeout(() => {
                this.directiveScroll.scrollToBottom(0, speed);

                this.directiveScroll.update();
            });
        }
    }


}
