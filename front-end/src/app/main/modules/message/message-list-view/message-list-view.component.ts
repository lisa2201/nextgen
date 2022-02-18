import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { NzModalRef } from 'ng-zorro-antd';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { QueryMessageService } from '../service/message.service';
import { takeUntil } from 'rxjs/operators';
import { Branch } from '../../branch/branch.model';
import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'message-list-view',
    templateUrl: './message-list-view.component.html',
    styleUrls: ['./message-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class MessageListViewComponent implements OnInit, OnDestroy {

    pageIndex: any;
    pageSize: any;
    dialogRef: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    defaultPageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    messageList: [];
    confirmModal: NzModalRef;
    showEffectiveDateColumn: boolean;
    branchList: Branch[];

    lastPage: boolean;
    currentPage: number;

    searchInput: FormControl;
    _unsubscribeAll: Subject<any>;
    isLoadingData: boolean;
    buttonLoader: boolean;

    @Output()
    updateTableScroll: EventEmitter<any>;

    clearService: boolean;
    constructor(
        private _fuseSidebarService: FuseSidebarService,
        private _queryMessageService: QueryMessageService,
        private _logger: NGXLogger,
    ) {
        this.tableLoading = false;
        this.updateTableScroll = new EventEmitter();
        this.searchInput = new FormControl({ value: null, disabled: false });
        this._unsubscribeAll = new Subject();
        this.messageList = [];
        this.clearService = true;
        this.defaultPageSizeOptions = [2, 3, 5, 10];
    }

    ngOnInit(): void {

        this._logger.debug('fees !!!');
        this._queryMessageService.onMessageChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((message: any) => {
                this._logger.debug('[message data]', message);

                this.messageList = message.items ? message.items : [];

                this.lastPage = message.lastPage ? message.lastPage : true;

                this.updateTableScroll.next();
            });

        this._queryMessageService.pageData
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageData) => {
                this.lastPage = pageData.lastPage;
                this.currentPage = pageData.currentPage;
                this.pageSize = pageData.pageSize;
            });

        // Subscribe to table loader changes
        this._queryMessageService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });



    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }


    clearSearch(e: MouseEvent): void {
        e.preventDefault();

        this.searchInput.patchValue('', { emitEvent: true });
        this.isLoadingData = true;
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.messageList = [];

        if (this.clearService) {
            this._logger.debug('message Service Data');
            this._queryMessageService.unsubscribeOptions();
        }
    }

    nextPage(event: MouseEvent): void {
        event.preventDefault();
        this._queryMessageService.nextPage();
    }

    previousPage(event: MouseEvent): void {
        event.preventDefault();
        this._queryMessageService.previousPage();
    }

    onPageSizeChange(pageSize: number): void {
        this._queryMessageService.onPageSizeChanged.next(pageSize);
    }

    queryData(event: MouseEvent): void {

        event.preventDefault();

        this._queryMessageService.onQueryByFilter.next();
        
    }

}
