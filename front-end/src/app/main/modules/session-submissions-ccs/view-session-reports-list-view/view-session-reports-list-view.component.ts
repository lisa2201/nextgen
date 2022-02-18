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
import {SessionSubmissionsService} from '../session-submissions.service';
import {EntitlementDetailComponent} from '../../entitlement-ccs/dialogs/entitlement-detail/entitlement-detail.component';
// import { NewOrEditComponent } from '../dialog/new-or-edit/new-or-edit.component';

@Component({
    selector: 'view-session-reports-list-view',
    templateUrl: './view-session-reports-list-view.component.html',
    styleUrls: ['./view-session-reports-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ViewSessionReportsListViewComponent implements OnInit, OnDestroy {
    dialogRef: any;

    pageIndex: any;

    total: number;
    mobilePagination: boolean;
    resultList: any[];

    /*sharing filter data*/
    filterData: any;

    /* pagination */
    tableLoading: boolean;
    lastPage: boolean;
    currentPage: number;
    pageSize: number;
    defaultPageSizeOptions: number[];

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
        private _sessionSubmissionsService: SessionSubmissionsService
    ) {
        this._unsubscribeAll = new Subject();
        this.tableLoading = false;
        this.dateInputStart = new FormControl();
        this.dateInputEnd = new FormControl();
        this.child = new FormControl();
        this.size = 'large';

        /* pagination */
        this.total = 0;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.defaultPageSizeOptions = [2, 3, 5];
    }

    ngOnInit(): void {
        this._logger.debug('ccs !!!');
        this._logger.debug('message list !!!');

        /* sharing filter data */
        this._sessionSubmissionsService.currentMessage.subscribe(message => this.filterData = message)


        this._childrenService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[list view - children]', response);
                this.childrenList = response.items;
            });
        console.log(this.childrenList);
        this._sessionSubmissionsService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[Query]', response);
                this.resultList = response.item ? response.item : [];
                this.lastPage = response.lastPage ? response.lastPage : true;

                if (response.serverErrors)
                {
                    console.log('Server Sent Error. Please READ!');
                    setTimeout(() => this._notification.displaySnackBar(response.serverErrors, NotifyType.ERROR), 200);
                }
                // this.updateTableScroll.next();
            });

        this._sessionSubmissionsService
            .pageData
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageData) => {
                console.log('pagedata in component listview');
                console.log(pageData);
                this.lastPage = pageData.lastPage;
                this.currentPage = pageData.currentPage;
                this.pageSize = pageData.pageSize;
            });

        // Subscribe to table loader changes
        this._sessionSubmissionsService
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
        this._sessionSubmissionsService.unsubscribeOptions();
        console.log('destroyed message');
    }

    goToDetail(event: MouseEvent, item: any): void {
        console.log('coming soon');
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


    onPageSizeChange(pageSize: number): void {
        this._sessionSubmissionsService.onPageSizeChanged.next(pageSize);
    }

    nextPage(event: MouseEvent): void {
         event.preventDefault();
         this._sessionSubmissionsService.nextPage();
    }

    previousPage(event: MouseEvent): void {
         event.preventDefault();
         this._sessionSubmissionsService.previousPage();
    }


}
