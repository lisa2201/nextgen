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
import {EntitlementCcsService} from '../../entitlement-ccs.service';


@Component({
    selector: 'view-entitlement-left-sidenav',
    templateUrl: './view-enititlement-left-sidenav.component.html',
    styleUrls: ['./view-entitlement-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ViewEntitlementLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    queryFiltersForm: FormGroup;
    /*dateInputStart: FormControl;
    dateInputEnd: FormControl;
    child: FormControl;*/

    defaultFilter: any;

    resultList: any[];
    size: string;
    childrenList: Child[];
    filters: any;
    /* share filter data */
    filterData: any;
    buttonLoaderDownload: boolean;
    buttonLoading: boolean;
    tableLoading: boolean;
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
     * @param _entitlementCCSService
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
        private _entitlementCCSService: EntitlementCcsService,
    )
    {
        // Set defaults

        this.size = 'large';
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.tableLoading = false;

        this.defaultFilter = {
            child : null,
            dateInputStart : null,
            annual_cap : 'all',
            absence_count : 'all',
            ccs_percentage : 'all',
            accs_percentage : 'all',
        };
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

        this._entitlementCCSService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {
                this.tableLoading = value;
            });

        /* set filter data */
        this.createFilterForm();

        // Subscribe to filter changes
        this._entitlementCCSService.onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[ccsdata]', response);
                this.resultList = response.item;
                // this.lengthChanged.emit(this.ccsList.length);
            });

        this._entitlementCCSService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                // this._logger.debug('[certificates or determinations]', response);

                this.resultList = response.item;

            });

        this.filters = [
            [],
            null,
            0
        ];

        this.setDefaultFilter();

        this._entitlementCCSService.getViewEntitlementDependency()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data) => {
                this.childrenList = data;
                this._logger.debug('[Child List]', this.childrenList);
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.resultList = [];
    }
    setMinDate(event): void {

    }

    getChildLabel(child: Child): string {

        if (child) {

            let childName = child.getFullName();

            if (child.enrollments && child.enrollments.length > 0) {
                return `${childName} (${_.first(child.enrollments).enrolId})`
            } else {
                return `${childName} (No Enrolment ID)`
            }

        } else {
            return '';
        }

    }

    filter(ev: MouseEvent, csv: boolean): void {
        ev.preventDefault();

        if (!this.fc.child.value) {
            setTimeout(() => this._notification.displaySnackBar('Please Select a Child', NotifyType.ERROR), 200);
            return null;
        }

        const sendData = {
            child: this.fc.child.value,
            dateOfEntitlement: DateTimeHelper.getUtcDate(this.fc.dateInputStart.value),
            annual_cap : this.fc.annual_cap.value,
            absence_count : this.fc.absence_count.value,
            ccs_percentage : this.fc.ccs_percentage.value,
            accs_percentage : this.fc.accs_percentage.value,
        };

        this._entitlementCCSService.onFilterChanged.next(sendData);

    }
    /**
     * On destroy
     */


    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
         return this.queryFiltersForm.controls;
    }

    createFilterForm(): void
    {

        this.queryFiltersForm = new FormGroup({
            child : new FormControl(null, [Validators.required]),
            dateInputStart : new FormControl(null, [Validators.required]),
            annual_cap : new FormControl(null),
            absence_count : new FormControl(null),
            ccs_percentage : new FormControl(null),
            accs_percentage : new FormControl(null),
        });
    }

    setDefaultFilter(): void {
        this.queryFiltersForm.patchValue(this.defaultFilter);
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();
        this.fc.child.patchValue(null);
        this.fc.dateInputStart.patchValue('');
    }

    showTheme(e: MouseEvent, isPdf: boolean):void {
        e.preventDefault();
        alert('coming soon!');
    }

    downloadCsv(): void {

        const sendData = {
            child: this.fc.child.value,
            dateOfEntitlement: DateTimeHelper.getUtcDate(this.fc.dateInputStart.value),
            annual_cap : this.fc.annual_cap.value,
            absence_count : this.fc.absence_count.value,
            ccs_percentage : this.fc.ccs_percentage.value,
            accs_percentage : this.fc.accs_percentage.value,
        };

        this._entitlementCCSService.getCsv(sendData);

    }
    
}

