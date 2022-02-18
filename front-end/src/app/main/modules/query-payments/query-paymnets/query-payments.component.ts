import {Component, OnInit, ViewChild} from '@angular/core';
import { fuseAnimations } from '@fuse/animations/index';
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
// import { QueryPaymentsService } from './ccs-setup.service';
import {finalize, takeUntil} from 'rxjs/operators';
import { Subject } from 'rxjs';
import {FormControl} from '@angular/forms';
import {DateTimeHelper} from '../../../../utils/date-time.helper';
import * as _ from 'lodash';
import {Router} from '@angular/router';
import {CcsOperationsService} from '../../ccms-operations/ccs-operations.service';
import {updateScrollPosition} from '../../../../shared/enum/update-scroll-position';
import {FusePerfectScrollbarDirective} from '../../../../../@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {QueryPaymentsService} from '../services/query-payments.service';

@Component({
    selector: 'ccms-query-payments',
    templateUrl: './query-payments.component.html',
    styleUrls: ['./query-payments.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class QueryPaymentsComponent implements OnInit {
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
        // private _ccsSetupService: QueryPaymentsService,
        private _router: Router,
        private _authService: AuthService,
        private _ccsOperationsService: QueryPaymentsService,
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

    }


    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    updateScroll(): void
    {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);
    }
}
