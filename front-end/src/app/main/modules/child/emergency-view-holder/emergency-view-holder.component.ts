import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Child } from '../child.model';
import {finalize, takeUntil} from 'rxjs/operators';
import { browserRefresh } from '../../../../app.component';
import { ChildService } from '../services/child.service';
import { Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { ChildrenService } from '../services/children.service';
import { fuseAnimations } from '../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import * as _ from 'lodash';
import {ActivatedRoute, ActivatedRouteSnapshot, Router} from '@angular/router';
import {NewOrEditEmergencyComponent} from './emergency-view/dialogs/new-or-edit-emergency/new-or-edit-emergency.component';
import {AppConst} from '../../../../shared/AppConst';
import {NotifyType} from '../../../../shared/enum/notify-type.enum';
import {MatDialog} from '@angular/material/dialog';
import {NotificationService} from '../../../../shared/service/notification.service';
import {EmergencyContactService} from './emergency-view/emergency-contact.service';
import { EmergencyContact } from './emergency.model';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import {CommonService} from '../../../../shared/service/common.service';

@Component({
    selector: 'emergency-emergency-view-holder',
    templateUrl: './emergency-view-holder.component.html',
    styleUrls: ['./emergency-view-holder.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class EmergencyViewHolderComponent implements OnInit {
    
    child: Child;
    private _unsubscribeAll: Subject<any>;
    emergencyData: EmergencyContact[];
    isLoadingData =  false;
    tableLoading = false;
    hasActionButton = true;
    dialogRef: any;
    confirmModal: NzModalRef;

    constructor(
        private _childService: ChildService,
        private _childrenService: ChildrenService,
        private _logger: NGXLogger,
        private _router: Router,
        private _route: ActivatedRoute,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _emergencyService: EmergencyContactService,
        private _modalService: NzModalService,
        private _commonService: CommonService
    ) {

        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        // subscribe to emergency contact changes
        this._emergencyService
            .onEmergencyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((emergency: any) => {

                this.emergencyData = emergency;

                // sort emergency contacts by call order
                this.emergencyData = this.emergencyData.sort((a, b) => {
                    if(b.callOrder && a.callOrder)
                        return a.callOrder < b.callOrder? -1 : 1;
                });

                this.isLoadingData = false;
            });

        this._emergencyService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) =>
            {
                this._logger.debug('[child booking request - child]', child);

                this.child = child;
            });
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /*
    * Edit Emergency Contact
    * */
    editDialog(item , e: MouseEvent): void
    {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(NewOrEditEmergencyComponent,
                {
                    panelClass: 'emergency-new-or-edit-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        view: 'emergency_view',
                        response: {
                            emergency: item
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
                this.ngOnInit();
                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });

    }

    /*
    * Add new Emergency Contact
    * */
    createEmergencyContact(e: MouseEvent): void
    {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(NewOrEditEmergencyComponent,
                {
                    panelClass: 'emergency-new-or-edit-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            child : this._route.snapshot.params['id']
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
                // this.ngOnInit();
                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }

    /*
    * Delete Emergency Contact
    * */
    delete(item , e: MouseEvent): void
    {

        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this._emergencyService
                                .deleteEmergency(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );

    }

    getChildProfileImage(item) : string
    {
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }

}
