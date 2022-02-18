import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import {FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors} from '@angular/forms';
import { Subject } from 'rxjs';
import {finalize, first, takeUntil} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations/index';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';



import { Branch } from 'app/main/modules/branch/branch.model';
import { CommonHelper } from 'app/utils/common.helper';
import {CcsOperationsService} from '../../../ccms-operations/ccs-operations.service';
import {DateTimeHelper} from '../../../../../utils/date-time.helper';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../../shared/service/notification.service';
import {ActivatedRoute} from '@angular/router';
import {AuthService} from '../../../../../shared/service/auth.service';
import {AppConst} from '../../../../../shared/AppConst';
import {Child} from '../../../child/child.model';
import {ChildrenService} from '../../../child/services/children.service';
import {MatDialog} from '@angular/material/dialog';
import {MediaObserver} from '@angular/flex-layout';
import {NzModalService} from 'ng-zorro-antd';
import {FuseSidebarService} from '../../../../../../@fuse/components/sidebar/sidebar.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {SessionSubmissionsService} from '../../session-submissions.service';


@Component({
    selector: 'view-session-reports-left-sidenav',
    templateUrl: './view-session-reports-left-sidenav.component.html',
    styleUrls: ['./view-session-reports-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ViewSessionReportsLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    queryFiltersForm: FormGroup;
    /*dateInputStart: FormControl;
    dateInputEnd: FormControl;
    child: FormControl;*/

    resultList: any[];
    size: string;
    childrenList: Child[];
    filters: any;
    /* share filter data */
    filterData: any;
    buttonLoaderDownload: boolean;
    buttonLoading: boolean;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param _authService
     * @param _matDialog
     * @param _notification
     * @param _modalService
     * @param _fuseSidebarService
     * @param _mediaObserver
     * @param _childrenService
     * @param _sessionSubmissionsService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _matDialog: MatDialog,
        // private _providerNotificationService: ProviderNotificationService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _childrenService: ChildrenService,
        private _sessionSubmissionsService: SessionSubmissionsService,
    )
    {
        // Set defaults

        this.size = 'large';
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('view Session Reports left side nav!!!');

        /* sharing filter data*/
        this._sessionSubmissionsService.currentMessage.subscribe(message => this.filterData = message)

        /* set filter data */
        this.createFilterForm();

        // Subscribe to filter changes
        this._sessionSubmissionsService.onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[ccsdata]', response);
                this.resultList = response.item;
                // this.lengthChanged.emit(this.ccsList.length);
            });

        this._sessionSubmissionsService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                // this._logger.debug('[certificates or determinations]', response);

                this.resultList = response.item;
                console.log('in component');
                console.log(response.item);

            });

        this.filters = [
            [],
            null,
            0
        ];
        this._childrenService
            .getChildrenList(this.filters)
            .pipe(first())
            .subscribe(
                (response: Child[]) =>
                {
                    this.childrenList = response;
                    console.log('in functino');
                    console.log(response);


                },
            );
        console.log('here it is');
        // console.log(this._childrenService.getChildrenList);
        console.log(this.childrenList);



    }

    disabledDateOnlyMonday = (current: Date): boolean => {
        return current.getDay() !== 1;
    };
    disabledDateOnlySunday = (current: Date): boolean => {
        if(this.fc.dateInputStart.value == null)
            return current.getDay() !== 0;
        else
            return differenceInCalendarDays.default(current, this.fc.dateInputStart.value) < 0 || current.getDay() !== 0;
    };
    setMinDate(event): void {

    }

    filter(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.fc.child.value) {
            setTimeout(() => this._notification.displaySnackBar('Please Select a Child', NotifyType.ERROR), 200);
            return null;
        }

        const sendData = {
            // service: (this.isSiteManager) ? this.fc.service.value : this.serviceList[0].service_id,
            child: this.fc.child.value,
            startDate: DateTimeHelper.getUtcDate(this.fc.dateInputStart.value),
            updatedSince: DateTimeHelper.getUtcDate(this.fc.updatedSince.value),
            includeHistory: this.fc.includeHistory.value, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };

        this._sessionSubmissionsService.changeMessage(sendData);


        this._sessionSubmissionsService.onFilterChanged.next(sendData);

        console.log(sendData);
    }
    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.resultList = [];
        this._sessionSubmissionsService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /*trackByFn(index: number, item: any): number
    {
        return index;
    }*/

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
         return this.queryFiltersForm.controls;
    }

    /*get getFormValues(): any
    {
        return {
            status: this.fc.status.value,
            level: this.fc.level.value,
            branch: this.fc.branch.value,
        };
    }*/

    createFilterForm(): void
    {

        this.queryFiltersForm = new FormGroup({
            child : new FormControl(),
            dateInputStart : new FormControl(),
            updatedSince: new FormControl(),
            includeHistory: new FormControl(),
        });
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();
        this.fc.child.patchValue(null);
        this.fc.dateInputStart.patchValue('');
        this.fc.updatedSince.patchValue('');
        this.fc.includeHistory.patchValue(false);
    }

    showTheme(e: MouseEvent, isPdf: boolean):void {
        e.preventDefault();
        alert('coming soon!');
    }

    downloadPdf(theme, isPdf): void{

        if (!this.fc.child.value) {
            setTimeout(() => this._notification.displaySnackBar('Please Select a Child', NotifyType.ERROR), 200);
            return null;
        }

        const sendData = {
            // service: (this.isSiteManager) ? this.fc.service.value : this.serviceList[0].service_id,
            child: this.fc.child.value,
            startDate: DateTimeHelper.getUtcDate(this.fc.dateInputStart.value),
            updatedSince: DateTimeHelper.getUtcDate(this.fc.updatedSince.value),
            includeHistory: this.fc.includeHistory.value, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };
        this._sessionSubmissionsService.changeMessage(sendData);
        this._sessionSubmissionsService.setEvents();

        this.buttonLoaderDownload = true;
        this.buttonLoading = true;

        this._sessionSubmissionsService.onFilterChangedReport.next(sendData);

        this._sessionSubmissionsService
            .getDataForReport(null)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.buttonLoaderDownload = false;
                    this.buttonLoading = false;
                    // this.isLoadingForm = false;
                    this._notification.clearSnackBar();

                    // setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                },
                error => {

                    this.buttonLoading = false;
                    this.buttonLoaderDownload = false;
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    /*
        setLastRememberOptions(values: any): void
        {
            for (const key in this.fc)
            {
                this.fc[key].patchValue(_.get(values, key), { emitEvent: false });
            }

            this.showFilterButton = true;
        }

        checkClearFilter(): void
        {
            this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
        }

        */
}

