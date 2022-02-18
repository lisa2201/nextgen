import { Component, OnInit, OnDestroy, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
import * as _ from 'lodash';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from '../../../../../utils/date-time.helper';
import { ServiceSetupService } from '../../../account-manager/service-setup/services/service-setup.service';
import { CCMSAuthenticationComponent } from '../../dialogs/ccms-authentication/ccms-authentication';

@Component({
    selector: 'services-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    confirmModal: NzModalRef;
    isLoading: boolean;
    dialogRef: any;
    tableLoading: boolean;
    services = [];

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _serviceService: ServiceSetupService,
    ) {
        this.isLoading = false;
        this._unsubscribeAll = new Subject();
        this.tableLoading = false;
        this.updateTableScroll = new EventEmitter();
    }

    ngOnInit(): void {
        this._logger.debug('ccs !!!');

        this._serviceService.onServiceChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {
                this.services = response;
                this._logger.debug(this.services);
            });

    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    pingCCMS(serviceID): void {

        this.isLoading = true;

        this._serviceService.pingCCMS(serviceID)
            .pipe(
                takeUntil(this._unsubscribeAll),
            )
            .subscribe(
                message => {
                    // setTimeout(() => this._notification.displaySnackBar(message.serviceID, NotifyType.SUCCESS), 200);
                    if (message.ReturnError == null) {
                        this.createTplModal(message);
                    }
                    else {
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
        if (messageData.ReturnError === 'No Credentials Error') {
            this.CCMSAuth(messageData.ServiceID, messageData.Service);
            setTimeout(() => this._notification.displaySnackBar(messageData.ReturnMessage, NotifyType.WARNING), 200);
            return null;
        }

        this.confirmModal = this._modalService.error({
            nzTitle: 'Error Connecting to CCMS',
            nzContent: messageData.ReturnMessage
        });
    }

    CCMSAuth(serviceID, serviceData): void {
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
                            serviceData: serviceData
                        }
                    }
                }
            );
    }

    trackByFn(index: number): number {
        return index;
    }


}
