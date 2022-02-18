import {Component, OnInit, ViewChild} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import {
    fadeInOnEnterAnimation,
    fadeOutOnLeaveAnimation
} from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
// import { CcsOperationsService } from './ccs-setup.service';
import {finalize, takeUntil} from 'rxjs/operators';
import { Subject } from 'rxjs';
import {FormControl} from '@angular/forms';
import {DateTimeHelper} from '../../../../utils/date-time.helper';
import * as _ from 'lodash';
import {Router} from '@angular/router';
import {CcsOperationsService} from '../ccs-operations.service';
import {updateScrollPosition} from '../../../../shared/enum/update-scroll-position';
import {FusePerfectScrollbarDirective} from '../../../../../@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector: 'ccms-query-remittance',
    templateUrl: './query-remittance.component.html',
    styleUrls: ['./query-remittance.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class QueryRemittanceComponent implements OnInit {
    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    dialogRef: any;
    ccsListValidListLength: boolean;
    dateInput: FormControl;
    clearingNumber: FormControl;
    paymentLineItem: FormControl;
    startDate: string;
    endDate: string;
    apiData: any;
    resultList: any[];
    // showCreate: boolean;
    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _commonService: CommonService,
        // private _ccsSetupService: CcsOperationsService,
        private _router: Router,
        private _authService: AuthService,
        private _ccsOperationsService: CcsOperationsService,
    ) {
        this.buttonLoader = false;
        this._unsubscribeAll = new Subject();
        this.dateInput = new FormControl();
        this.clearingNumber = new FormControl();
        this.paymentLineItem = new FormControl();
        // this.showCreate = false;
        // this.resultList = [];
        // this.apiData = null;
    }

    ngOnInit(): void {

        if (!this._ccsOperationsService.eventsSet) {
            this._ccsOperationsService.setEvents();
        }
        /*this._logger.debug('ccs !!!');

        this._ccsOperationsService.onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[ccsdata]', response);
                this.resultList = response;
                // this.lengthChanged.emit(this.ccsList.length);
            });

        this._ccsOperationsService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                // this._logger.debug('[certificates or determinations]', response);

                this.resultList = response;
                console.log('in component');
                console.log(response);
                // this.total = response.totalDisplay;

            });*/

    }

    /*filter(): void {
        // console.log(this.dateInput.value[0]);
        this.startDate =  (this.dateInput.value) ? DateTimeHelper.getUtcDate(this.dateInput.value[0]) : null;
        this.endDate =  (this.dateInput.value) ?  DateTimeHelper.getUtcDate(this.dateInput.value[1]) : null;

        // console.log('start date :' + this.startDate + ' end date: ' + this.endDate);

        const sendData = {
            startDate: this.startDate,
            endDate: this.endDate,
            clearingNumber: this.clearingNumber.value,
            paymentLineItem: this.paymentLineItem.value, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };
       /!* this._ccsOperationsService.onFilterChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {
                this.services = response;
                console.log(this.services + 'responce');
            });*!/
        // this._ccsOperationsService.getQuery(sendData);


        this._ccsOperationsService.getQuery(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response => {
                    this.apiData = response.item.ListOfPayments.Payment;
                    this.resultList = this.apiData;
                    console.log('A WIRE');
                    console.log(response);
                },
                error => {
                    this.buttonLoader = false;
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );

        console.log(sendData);
    }*/

    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    updateScroll(e: MouseEvent): void
    {
        e.preventDefault();
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);
    }
}
