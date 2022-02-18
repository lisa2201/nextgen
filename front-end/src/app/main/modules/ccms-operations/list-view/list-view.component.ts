import {Component, OnInit, OnDestroy, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { Invitation } from '../../invitation/invitation.model';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
// import { CcsOperationsService } from '../ccs-setup.service';
// import { CcsSetup } from '../ccs-setup.model';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import { Alert } from 'selenium-webdriver';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import {CcsOperationsService} from '../ccs-operations.service';
import {ManageRemittanceQueryLeftSidenavComponent} from '../sidenavs/manage-remittance-query-left-sidenav/manage-remittance-query-left-sidenav.component';
import {CCMSAuthenticationComponent} from '../dialogs/ccms-authentication/ccms-authentication';
import {QueryRemittanceByCcsApprovalDetailComponent} from '../dialogs/query-remittance-by-ccs-approval-detail/query-remittance-by-ccs-approval-detail.component';
// import { NewOrEditComponent } from '../dialog/new-or-edit/new-or-edit.component';

@Component({
    selector: 'query-remittance-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ListViewComponent implements OnInit, OnDestroy {
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


    mapOfSort: { [key: string]: any } = {
        email: null,
        branch: null,
        expires: null
    };

    filterValue: any = null;
    searchInput: FormControl;
    _unsubscribeAll: any;

    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _ccsOperationsService: CcsOperationsService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {
        this.resultList = [];


        /* pagination */
        this.total = 0;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.defaultPageSizeOptions = [2, 3, 5];


        this.searchInput = new FormControl({ value: null, disabled: false });


        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this._logger.debug('ccs !!!');

        /* sharing filter data*/
        this._ccsOperationsService.currentMessage.subscribe(message => this.filterData = message)


        this._ccsOperationsService
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

        this._ccsOperationsService
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
        this._ccsOperationsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    resetSort(): void {
        for (const key in this.mapOfSort) {
            this.mapOfSort[key] = null;
        }
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

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
    }


    onPageSizeChange(pageSize: number): void {
        this._ccsOperationsService.onPageSizeChanged.next(pageSize);
    }

    nextPage(event: MouseEvent): void {
        event.preventDefault();
        this._ccsOperationsService.nextPage();
    }

    previousPage(event: MouseEvent): void {
        event.preventDefault();
        this._ccsOperationsService.previousPage();
    }

    goToDetail(event: MouseEvent, item: any): void {
        this.dialogRef = this._matDialog
            .open(QueryRemittanceByCcsApprovalDetailComponent,
                {
                    panelClass: 'query-remittance-by-ccs-approval-detail',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {
                            item: item,
                        }
                    }
                }
            );
    }

    queryData(event: MouseEvent): void {

        event.preventDefault();

        this._ccsOperationsService.onQueryByFilter.next();
        
    }

}
