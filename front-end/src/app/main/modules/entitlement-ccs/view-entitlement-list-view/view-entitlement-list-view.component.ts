import {Component, OnInit, OnDestroy, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { Invitation } from '../../invitation/invitation.model';
import { fuseAnimations } from '@fuse/animations/index';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
// import { QueryPaymentsService } from '../ccs-setup.service';
// import { CcsSetup } from '../ccs-setup.model';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import { Alert } from 'selenium-webdriver';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import {CcsOperationsService} from '../../ccms-operations/ccs-operations.service';
import {ManageRemittanceQueryLeftSidenavComponent} from '../../ccms-operations/sidenavs/manage-remittance-query-left-sidenav/manage-remittance-query-left-sidenav.component';
import {CCMSAuthenticationComponent} from '../../ccms-operations/dialogs/ccms-authentication/ccms-authentication';
import {QueryRemittanceByCcsApprovalDetailComponent} from '../../ccms-operations/dialogs/query-remittance-by-ccs-approval-detail/query-remittance-by-ccs-approval-detail.component';
import {ChildrenService} from '../../child/services/children.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {Child} from '../../child/child.model';
import {EntitlementCcsService} from '../entitlement-ccs.service';
import {EntitlementDetailComponent} from '../dialogs/entitlement-detail/entitlement-detail.component';
// import { NewOrEditComponent } from '../dialog/new-or-edit/new-or-edit.component';

@Component({
    selector: 'view-entitlement-list-view',
    templateUrl: './view-entitlement-list-view.component.html',
    styleUrls: ['./view-entitlement-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ViewEntitlementListViewComponent implements OnInit, OnDestroy {
    dialogRef: any;
    resultList: any[];

    /*sharing filter data*/
    filterData: any;

    /* pagination */
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total: number;
    tableLoading: boolean;
    mobilePagination: boolean;


    dateInputStart: FormControl;
    dateInputEnd: FormControl;
    child: FormControl;
    size: string;
    childrenList: Child[];

    private _unsubscribeAll: Subject<any>;


    filterValue: any = null;
    searchInput: FormControl;

    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        // private _providerNotificationService: ProviderNotificationService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _childrenService: ChildrenService,
        private _entitlementCCSService: EntitlementCcsService
    ) {
        this._unsubscribeAll = new Subject();
        this.tableLoading = false;
        this.dateInputStart = new FormControl();
        this.dateInputEnd = new FormControl();
        this.child = new FormControl();
        this.size = 'large';

        // pagination
        this.pageSizeChanger = true;
        this.pageSize = this._entitlementCCSService.defaultPageSize;
        this.pageIndex = this._entitlementCCSService.defaultPageIndex;
        this.pageSizeOptions = this._entitlementCCSService.defaultPageSizeOptions;
        this.mobilePagination = false;

    }

    ngOnInit(): void {
        this._logger.debug('ccs !!!');
        this._logger.debug('message list !!!');

        /* sharing filter data */
        this._entitlementCCSService.currentMessage.subscribe(message => this.filterData = message);

        this._childrenService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[list view - children]', response);
                this.childrenList = response.items;
            });
        this._entitlementCCSService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[Query]', response);

                this.resultList = response.item ? response.item : [];

                if (response.serverErrors)
                {
                    console.log('Server Sent Error. Please READ!');
                    setTimeout(() => this._notification.displaySnackBar(response.serverErrors, NotifyType.ERROR), 200);
                }
                // this.updateTableScroll.next();
            });

        this._entitlementCCSService
            .pageData
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageData) => {
                this.pageSize = pageData.pageSize;
            });

        // Subscribe to table loader changes
        this._entitlementCCSService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.resultList = [];
        console.log('destroyed message');
    }

    disabledDateOnlyMonday = (current: Date): boolean => {
        return current.getDay() !== 1;
    };
    disabledDateOnlySunday = (current: Date): boolean => {
        if(this.dateInputStart.value == null)
            return current.getDay() !== 0;
        else
            return differenceInCalendarDays.default(current, this.dateInputStart.value) < 0 || current.getDay() !== 0;
    };
    setMinDate(event): void {

    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._entitlementCCSService.defaultPageIndex;
        }

        this._entitlementCCSService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * clear search
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) {
            e.preventDefault();
        }

       // this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    goToDetail(event: MouseEvent, item: any): void {
        this.dialogRef = this._matDialog
            .open(EntitlementDetailComponent,
                {
                    panelClass: 'entitlement-detail',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {
                            item: item,
                        }
                    }
                });
    }

}
