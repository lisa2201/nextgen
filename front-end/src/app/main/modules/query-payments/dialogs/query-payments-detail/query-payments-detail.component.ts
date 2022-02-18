import {Component, OnInit, ViewEncapsulation, OnDestroy, Inject} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Location } from '@angular/common';
import { NGXLogger } from 'ngx-logger';

import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import * as _ from 'lodash';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
    selector: 'query-payments-detail',
    templateUrl: './query-payments-detail.component.html',
    styleUrls: ['./query-payments-detail.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class QueryPaymentsDetailComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;


    dialogRef: any;
    remittanceData: any;

    constructor(
        private _location: Location,
        private _logger: NGXLogger,
        public matDialogRef: MatDialogRef<QueryPaymentsDetailComponent>,
        private _notification: NotificationService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();
        this.remittanceData = this._data.response.item;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {



    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {

    }
}
