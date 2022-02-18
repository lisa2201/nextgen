import {Component, OnInit, ViewEncapsulation, OnDestroy, TemplateRef, ViewChild} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import {finalize, takeUntil} from 'rxjs/operators';

import * as _ from 'lodash';

import {NotifyType} from '../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../shared/service/notification.service';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import {DateTimeHelper} from '../../../../utils/date-time.helper';
import {ServiceSetupService} from '../../account-manager/service-setup/services/service-setup.service';
import { Router } from '@angular/router';
import { CommonService } from 'app/shared/service/common.service';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';


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

    services = [];

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;

    /**
    * Constructor
    *
    * @param {NGXLogger} _logger
    * @param {NotificationService} _notification
    * @param {MatDialog} _matDialog
    * @param {NzModalService} _modalService
    * @param {Router} _router
    */
    constructor(
        private _serviceService: ServiceSetupService,
        private _commonService: CommonService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _router: Router
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
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
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

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 0);
    }

}
