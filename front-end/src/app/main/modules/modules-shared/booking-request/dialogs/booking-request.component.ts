import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';
import { NgProgress, NgProgressRef } from 'ngx-progressbar';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { AuthService } from 'app/shared/service/auth.service';
import { BookingRequestService } from '../services/booking-request.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import endOfWeek  from 'date-fns/endOfWeek';
import startOfWeek from 'date-fns/startOfWeek';
import startOfMonth from 'date-fns/startOfMonth';
import endOfMonth from 'date-fns/endOfMonth';
import addMonths from 'date-fns/addMonths';

import { AppConst } from 'app/shared/AppConst';
import { BookingRequest } from 'app/main/modules/child/booking-request/booking-request.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Child } from 'app/main/modules/child/child.model';

import { BookingRequestActionComponent } from './sidebars/action/action.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { CommonHelper } from 'app/utils/common.helper';

@Component({
    selector: 'booking-request-view',
    templateUrl: './booking-request.component.html',
    styleUrls: ['./booking-request.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingRequestViewComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    private _sideBar = 'booking-request-action-sidebar';

    dialogTitle: string;
    filterForm: FormGroup;

    children: Child[];
    fees: Fee[];
    rooms: Room[];

    bookingRequests: BookingRequest[];
    bookingPreview: Array<any>;

    batchTypeOptions: Array<object> = [
        {
            name: 'Day Selection',
            value: '0'
        },
        {
            name: 'Week Selection',
            value: '1'
        },
        {
            name: 'Custom Selection',
            value: '2'
        }
    ] 

    dateRanges: object = { 
        'Today': [new Date(), new Date()], 
        'This Week': [startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })], 
        'This Month': [startOfMonth(new Date()), endOfMonth(new Date())],
        '3 Months': [startOfMonth(new Date()), addMonths(endOfMonth(new Date()), 3)],
    };

    selectedAction: { image: string, name: string, value: string };
    actionTypes: Array<{ image: string, name: string, value: string, position: number }> = [
        {
            image: 'casual-booking',
            name: 'Casual Requests',
            value: '0',
            position: 1
        },
        // {
        //     image: 'standard-bookings',
        //     name: 'Standard Requests',
        //     value: '1',
        //     position: 2
        // },
        {
            image: 'absent',
            name: 'Absence Requests',
            value: '2',
            position: 3
        },
        {
            image: 'holiday',
            name: 'Holiday Requests',
            value: '3',
            position: 4
        },
        {
            image: 'late-drop',
            name: 'Late Drop Requests',
            value: '4',
            position: 5
        },
        {
            image: 'late-pick',
            name: 'Late Pickup Requests',
            value: '5',
            position: 6
        }
    ];

    confirmModal: NzModalRef;

    viewLoading: boolean;
    progressRef: NgProgressRef;

    selectedActionItem: BookingRequest;
    showOnlyRejectOption: boolean;

    absReasons: any;

    defaultFilterValue: any = {
        child: null,
        start: null,
        end: null
    }

    @ViewChild(BookingRequestActionComponent)
    actionComponent: BookingRequestActionComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        public matDialogRef: MatDialogRef<BookingRequestViewComponent>,
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _requestService: BookingRequestService,
        private _cdr: ChangeDetectorRef,
        private _ngProgress: NgProgress,
        private _fuseSidebarService: FuseSidebarService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.dialogTitle = 'Booking Requests';
        this.bookingRequests = []; // this._data.response;
        this.bookingPreview = [];
        this.children = [];
        this.fees = [];
        this.rooms = [];
        this.selectedAction = this.actionTypes[0];
        this.viewLoading = false;
        this.progressRef = this._ngProgress.ref('bookingRequestProgress');
        this.selectedActionItem = null;
        this.showOnlyRejectOption = false;

        this.filterForm = this.createFilterForm();

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
        this._logger.debug('booking request view !!!', this._data);

        this.onChanges();
    }

    /**
     * Respond after initializes the component's views
     */
    ngAfterViewInit(): void 
    {
        setTimeout(() => this.getBookingRequests(false), 100);
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to booking request dependency changes
        this._requestService
            .onDependencyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[booking request]', response);

                if (_.isEmpty(response)) return;

                this.children = response.children;
                this.rooms = response.rooms;
                this.fees = response.fees;

                this._cdr.markForCheck();
            });

        // Subscribe to view loader changes
        this._requestService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                value ? this.progressRef.start() : this.progressRef.complete();
            });

        // Subscribe to view booking call changes
        this._requestService
            .triggerBookingRequestViewCall
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.getBookingRequests(false, true));

        // Subscribe to form value changes
        this.filterForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.onTypeChange(value));
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * update loader status
     *
     * @param {*} value
     */
    updateLoaderStatus(value: boolean): void
    {
        this.viewLoading = value;

        this._cdr.markForCheck();
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.filterForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createFilterForm(): FormGroup
    {
        return new FormGroup({
            child: new FormControl(null, [Validators.required]),
            type: new FormControl('0', [Validators.required]),
            date: new FormControl('', [Validators.required]),
            week: new FormControl('', [Validators.required]),
            range: new FormControl('', [Validators.required]),
        });
    }

    /**
     * validate on type change [date|week]
     *
     * @param {*} value
     */
    onTypeChange(value: any): void
    {
        // clear validation
        this.filterForm.get('date').clearValidators();
        this.filterForm.get('date').patchValue(null, { emitEvent: false });

        this.filterForm.get('week').clearValidators();
        this.filterForm.get('week').patchValue(null, { emitEvent: false });

        this.filterForm.get('range').clearValidators();
        this.filterForm.get('range').patchValue(null, { emitEvent: false });

        if(value === '0')
        {
            this.filterForm.get('date').setValidators([Validators.required]);
            this.filterForm.get('date').updateValueAndValidity();
        }
        else if(value === '1')
        {
            this.filterForm.get('week').setValidators([Validators.required]);
            this.filterForm.get('week').updateValueAndValidity();
        }
        else
        {
            this.filterForm.get('range').setValidators([Validators.required]);
            this.filterForm.get('range').updateValueAndValidity();
        }

        this._cdr.markForCheck();
    }

    /**
     * load requests base on action type
     *
     * @param {number} type
     */
    tabPositionChange(type: number): void
    {
        this.selectedAction = this.actionTypes[type];

        this._cdr.markForCheck();
    }

    /**
     * get booking types count 
     *
     * @param {string} type
     * @returns {number}
     */
    getTypeCount(type: string): number
    {
        return this.bookingRequests.filter(i => i.type === type).length;
    }
    
    /**
     * filter list by request type
     *
     * @returns {*}
     */
    getDataSource(): any
    {
        return _.reverse(_.sortBy(this.bookingRequests.filter(i => i.type === this.selectedAction.value), i => i.date));
    }

    /**
     * get booking request
     *
     * @param {boolean} [isFiltered=false]
     * @param {boolean} [ignoreDependency=false]
     */
    getBookingRequests(isFiltered: boolean = false, ignoreDependency: boolean = false): void
    {
        this._requestService
            .getBookingRequest(isFiltered, ignoreDependency)
            .then(response => 
            {
                this._logger.debug('[booking request]', response);

                this.bookingRequests = response;

                this._cdr.markForCheck();
            })
            .catch(error => 
            {
                throw error;
            });
    }

    /**
     * get filter form values
     *
     * @returns {*}
     */
    getFilterFormValue(): any
    {
        const filter = {
            child: this.fc.child.value,
            start: null,
            end: null
        };

        switch (this.fc.type.value) 
        {
            case '1':
                filter.start = DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),
                filter.end = DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly)
                break;

            case '2':
                filter.start = DateTimeHelper.getUtcDate(_.head(this.fc.range.value));
                filter.end = DateTimeHelper.getUtcDate(_.last(this.fc.range.value));
                break;
        
            default:
                filter.start = DateTimeHelper.getUtcDate(this.fc.date.value);
                filter.end = DateTimeHelper.getUtcDate(this.fc.date.value);
                break;
        }
        
        return filter;
    }

    /**
     * reset filter form
     *
     */
    setFilterFormDefaults(): void
    {
        this.filterForm.get('type').patchValue('0', { emitEvent: false });
        this.filterForm.get('child').patchValue(null, { emitEvent: false });
        this.filterForm.get('date').patchValue(null, { emitEvent: false });
        this.filterForm.get('week').patchValue(null, { emitEvent: false });
        this.filterForm.get('range').patchValue(null, { emitEvent: false });
    }

    /**
     * check if filter button can be enabled
     *
     * @returns {boolean}
     */
    enableFilter(): boolean
    {
        return CommonHelper.isEqual(this.defaultFilterValue, this.getFilterFormValue());
    }

    /**
     * check if clear button can show
     *
     * @returns {boolean}
     */
    showFilterClear(): boolean
    {
        return !_.isNull(this._requestService.filterBy) && !CommonHelper.isEqual(this.defaultFilterValue, this.getFilterFormValue());
    }

    /**
     * filter booking request
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    filter(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.viewLoading)
        {
            return;
        }

        this._requestService.onFilterChanged.next(this.getFilterFormValue());

        this.getBookingRequests(true, true);
    }

    /**
     * clear filters
     *
     * @param {MouseEvent} e
     */
    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        // reset to default
        this.setFilterFormDefaults();

        this._requestService.onFilterChanged.next(null);

        // update view
        this.getBookingRequests(false, true);
    }

    /**
     * open request action sidebar
     *
     * @param {MouseEvent} e
     * @param {BookingRequest} item
     * @returns {void}
     */
    requestAction(e: MouseEvent, item: BookingRequest): void
    {
        e.preventDefault();

        if (this.viewLoading || item.isLoading)
        {
            return;
        }

        item.isLoading = true;

        this._requestService
            .verifyBookingRequest(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => 
                {
                    item.isLoading = false;

                    this._cdr.markForCheck();
                })
            )
            .subscribe(
                res => 
                {
                    if (_.isEmpty(res))
                    {
                        return;
                    }

                    this.selectedActionItem = res.request;
                    this.bookingPreview = res.preview;
                    this.showOnlyRejectOption = res.error_type;
                    this.absReasons = res.abs_reason;

                    this.bookingRequests[this.bookingRequests.findIndex(i => i.id === res.id)] = this.selectedActionItem;
                    
                    setTimeout(() => this._fuseSidebarService.getSidebar(this._sideBar).toggleOpen(), 100);
                },
                error =>
                {
                    throw error;
                }
            );

        
    }
}
