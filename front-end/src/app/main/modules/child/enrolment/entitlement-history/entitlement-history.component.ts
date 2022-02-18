import {Component, OnInit, OnDestroy, Input} from '@angular/core';
import { fuseAnimations } from '@fuse/animations/index';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import {CcsEntitlementHistoryService} from '../services/ccs-entitlement-history.service';
import {CcsEntitlementModel} from '../models/ccs-entitlement.model';
import {Child} from '../../child.model';
import {Enrolment} from '../models/enrolment.model';

@Component({
    selector: 'child-entitlement-history-view',
    templateUrl: './entitlement-history.component.html',
    styleUrls: ['./entitlement-history.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class EntitlementHistoryComponent implements OnInit, OnDestroy {
    messageData: CcsEntitlementModel[];
    tableLoading: boolean;
    dateInput: FormControl;
    size: string;

    // pagination
    total: number;
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    mobilePagination: boolean;
    private _unsubscribeAll: Subject<any>;
    @Input() selected: Enrolment;

    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _ccEntitlementHistoryService: CcsEntitlementHistoryService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {
        this._unsubscribeAll = new Subject();
        this.tableLoading = false;
        this.dateInput = new FormControl();
        this.size = 'samll';

        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.pageSize = this._ccEntitlementHistoryService.defaultPageSize;
        this.pageIndex = this._ccEntitlementHistoryService.defaultPageIndex;
        this.pageSizeOptions = this._ccEntitlementHistoryService.defaultPageSizeOptions;
    }

    ngOnInit(): void {
        this._logger.debug('message list !!!');


        this._ccEntitlementHistoryService.onMessageChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((messageList: any) => {
                this._logger.debug('[messagedata]', messageList);
                this.messageData = messageList.items;
                this.total = messageList.total;
            });

        this._ccEntitlementHistoryService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        this._ccEntitlementHistoryService.setEvents();
        this._ccEntitlementHistoryService.onEnrolmentIDChanged.next({
            enrolmentID: this.selected.enrolId
        });
        /*this._ccEntitlementHistoryService
            .getMessageData(this.selected.enrolId)
            .pipe(
                takeUntil(this._unsubscribeAll),
            )
            .subscribe(
                response => this.messageData = response.messagelist,
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );*/
        /*this.dateInput.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(dateChanged => {
                

                if (!_.isNull(dateChanged)) {
                    this._logger.debug('[search change]', DateTimeHelper.getUtcDate(dateChanged));
                    this._providerNotificationService.onFilterChanged.next(
                        DateTimeHelper.getUtcDate(dateChanged)
                    );
                }
                else
                {
                    this._logger.debug('[search change]', dateChanged);
                    this._providerNotificationService.onFilterChanged.next(dateChanged);
                }
                
            });*/
    }

    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._ccEntitlementHistoryService.defaultPageIndex;
        }

        this._ccEntitlementHistoryService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    ngOnDestroy(): void {
        
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    };

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }
}
