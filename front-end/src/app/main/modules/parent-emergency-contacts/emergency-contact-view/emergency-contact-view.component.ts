import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Child } from 'app/main/modules/child/child.model';
import {finalize, takeUntil} from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { fuseAnimations } from '../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import * as _ from 'lodash';
import {ActivatedRoute} from '@angular/router';
import {NewOrEditEmergencyComponent} from './dialogs/new-or-edit-emergency/new-or-edit-emergency.component';
import {AppConst} from '../../../../shared/AppConst';
import {NotifyType} from '../../../../shared/enum/notify-type.enum';
import {MatDialog} from '@angular/material/dialog';
import {NotificationService} from '../../../../shared/service/notification.service';
import {EmergencyContactService} from './services/emergency-contact.service';
import {EmergencyContact } from './emergency.model';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';

@Component({
    selector: 'emergency-contact-view',
    templateUrl: './emergency-contact-view.component.html',
    styleUrls: ['./emergency-contact-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class EmergencyContactViewComponent implements OnInit {
    
    child: Child;
    private _unsubscribeAll: Subject<any>;
    emergencyData: EmergencyContact [];
    isLoadingData =  false;
    tableLoading = false;
    hasActionButton = true;
    dialogRef: any;
    confirmModal: NzModalRef;

    constructor(
        private _logger: NGXLogger,
        private _route: ActivatedRoute,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _emergencyService: EmergencyContactService,
        private _modalService: NzModalService,
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
                this.isLoadingData = false;
            });
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
                this.ngOnInit();
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
                                .deleteEmergency(item.id, item.child.index)
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

}
