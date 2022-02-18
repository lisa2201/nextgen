import {Component, OnInit, ViewEncapsulation, OnDestroy, TemplateRef} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { forkJoin, Subject } from 'rxjs';
import {finalize, takeUntil} from 'rxjs/operators';
import { ServiceSetupService } from './services/service-setup.service';
import {NotifyType} from '../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../shared/service/notification.service';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import {AppConst} from '../../../../shared/AppConst';
import {MatDialog} from '@angular/material/dialog';
import {DateTimeHelper} from '../../../../utils/date-time.helper';
import { ReadServiceDialogComponent } from './dialogs/read-service-dialog/read-service-dialog.component';
import { AccountManagerService } from '../account-manager.service';


@Component({
    selector: 'app-service-setup',
    templateUrl: './service-setup.component.html',
    styleUrls: ['./service-setup.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ],
    encapsulation: ViewEncapsulation.None
})
export class ServiceSetupComponent implements OnInit, OnDestroy {


    private _unsubscribeAll: Subject<any>;
    confirmModal: NzModalRef;
    isLoading: boolean;
    dialogRef: any;
    buttonLoader: boolean; 

    services = [];
    /**
    * Constructor
    *
    * @param {NGXLogger} _logger
    * @param {NotificationService} _notification
    * @param {MatDialog} _matDialog
    * @param {NzModalService} _modalService
    */


    constructor(
        private _serviceService: ServiceSetupService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        public _matDialog: MatDialog,
        private _accountManagerService: AccountManagerService
    ) {

        this.isLoading = false;
        this._unsubscribeAll = new Subject();
    }


    ngOnInit(): void {


        this._serviceService.onServiceChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {
                this.services = response;
                console.log(this.services + 'responce');
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    pingCCMS(serviceID): void{
        this.isLoading = true;
        this._serviceService.pingCCMS(serviceID)
            .pipe(
                takeUntil(this._unsubscribeAll),
            )
            .subscribe(
                message => {
                        // setTimeout(() => this._notification.displaySnackBar(message.serviceID, NotifyType.SUCCESS), 200);
                        if (message.ReturnError == null){
                            this.createTplModal(message);
                        }
                        else{
                            this.createTplModalError(message);
                        }
                        this.isLoading = false;
                },
                error => {
                    this.isLoading = false;
                    throw error;
                }
            );
    }
    createTplModal(messageData: any): void {
        this.confirmModal = this._modalService.success({
            nzTitle: 'Success',
            nzContent: 'Connection to CCMS successful <br> Processed Date and Time : ' + DateTimeHelper.getUtcDate(messageData.PingRequest) + ' at ' + DateTimeHelper.getUtcTime(messageData.PingRequest)
        });
    }

    createTplModalError(messageData: any): void {
        this.confirmModal = this._modalService.error({
           nzTitle: 'Error Connecting to CCMS',
           nzContent: messageData.ReturnMessage
        });
    }

    /*CCMSAuth(serviceID, username): void{
        this.dialogRef = this._matDialog
            .open(CCMSAuthenticationComponent,
                {
                    panelClass: 'service-ccms-authentication',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        response: {
                            service: serviceID,
                            username: username
                        }
                    }
                });
    }*/

    addDialog(e: MouseEvent): void {

        e.preventDefault();

        forkJoin([
            this._accountManagerService.getCcsSetups()
        ])
        .subscribe(([ccsSetups]) => {

            this.dialogRef = this._matDialog
                .open(ReadServiceDialogComponent,
                    {
                        panelClass: 'add-service-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.NEW,
                            ccsSetups: ccsSetups,
                            response: {}
                        }
                    });
    
            this.dialogRef
                .afterClosed()
                .subscribe(message => {
                    if (!message) {
                        return;
                    }
    
                    this._notification.clearSnackBar();
    
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
    
                    this._serviceService.getServices()
                    .subscribe(
                        (response: any) => {
                            this._serviceService.services = response;
                            this._serviceService.onServiceChanged.next([...response]);
                        }
                    );
                });

        });


    }
}
