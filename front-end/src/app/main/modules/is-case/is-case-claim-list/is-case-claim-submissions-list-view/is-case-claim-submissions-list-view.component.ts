import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { IsCaseService } from '../../services/is-case.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { ISCaseClaimSubmission } from '../../is-case-claim-submission.model';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateIsClaimDialogComponent } from '../../dialogs/create-is-claim-dialog/create-is-claim-dialog.component';

@Component({
    selector: 'app-is-case-claim-submissions-list-view',
    templateUrl: './is-case-claim-submissions-list-view.component.html',
    styleUrls: ['./is-case-claim-submissions-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseClaimSubmissionsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    submissionList: ISCaseClaimSubmission[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    confirmModal: NzModalRef;
    dialogRef: any;

    mapOfSort: { [key: string]: any } = {
        date: null,
        parent: null,
        amount: null,
        description: null,
        type: null
    };
    
    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _isCaseService: IsCaseService,
        private _mediaObserver: MediaObserver,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _matDialog: MatDialog
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._isCaseService.defaultPageSize;
        this.pageIndex = this._isCaseService.defaultPageIndex;
        this.pageSizeOptions = this._isCaseService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('is case claim submissions list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to case claim submission
        this._isCaseService
            .onISCaseClaimSubmissionsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[IS Case Claim Submissions]', response);

                this.submissionList = response.items;
                this.total = response.totalDisplay;
                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                if (response.total < 1 || response.totalDisplay < 1) { this.clearSearch(null, false); }

                this.updateTableScroll.next();
            });

        // Subscribe to search input changes
        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText)) {
                    this._isCaseService.onISCaseClaimSubmissionsSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._isCaseService
            .onISCaseClaimSubmissionsTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._isCaseService.unsubscribeISCaseClaimSubmissionsOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------


    /**
     * Track By Function
     * @param {number} index 
     * @param {any} item 
     * @returns {number}
     */
    trackByFn(index: number, item: any): number {
        return index;
    }

    /**
     * Reset Sort
     */
    resetSort(): void {
        for (const key in this.mapOfSort) { this.mapOfSort[key] = null; }
    }

    /**
     * Clear search
     * @param {MouseEvent} e 
     * @param {boolean} _emit 
     */
    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
    }



    /**
     * Table change handler
     * @param {boolean} reset 
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._isCaseService.defaultPageIndex;
        }

        this._isCaseService.onISCaseClaimSubmissionsPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * sort column
     *
     * @param {string} sortName
     * @param {string} sortValue
     */
    sortColumns(sortName: string, sortValue: string): void
    {
        if (this.total < 1)
        {
            setTimeout(() => this.resetSort(), 0);

            return;
        }

        for (const key in this.mapOfSort)
        {
            this.mapOfSort[key] = (key === sortName) ? sortValue : null;
        }

        this._isCaseService.onISCaseClaimSubmissionsSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    deleteSubmission(event: MouseEvent, id: string): void {

        event.preventDefault();

        const sendData = {
            id: id
        };

        // this.tableLoading = true;

        this.confirmModal = this._modalService.confirm({
            nzTitle: AppConst.dialogContent.DELETE.TITLE,
            nzContent: AppConst.dialogContent.DELETE.BODY,
            nzWrapClassName: 'vertical-center-modal',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => {
                return new Promise((resolve, reject) => {

                    this._isCaseService
                        .deleteClaimSubmission(sendData)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => {
                                this.tableLoading = false;
                                resolve();
                            })
                        )
                        .subscribe(
                            message => {
                                setTimeout(() => {

                                    this._notification.displaySnackBar(
                                        message,
                                        NotifyType.SUCCESS
                                    );

                                    this.onTableChange();

                                }, 200);
                            },
                            error => {
                                throw error;
                            }
                        );
                });
            }
        });

    }

    editClaim(event: MouseEvent, item: ISCaseClaimSubmission): void {

        event.preventDefault();

        this.tableLoading = true;

        const resObservable = forkJoin([
            this._isCaseService.addISCaseClaimDependency(item.is_case)
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(([depData]) => {

                this._logger.debug('[Dependency Data]', depData);

                this.dialogRef = this._matDialog
                    .open(CreateIsClaimDialogComponent,
                        {
                            panelClass: 'create-is-claim-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                isCase: item.is_case,
                                children: depData.children ? depData.children : [],
                                educators: depData.educators ? depData.educators : [],
                                edit: true,
                                submission: item,
                                response: {}
                            }
                        });

                this.dialogRef
                    .afterClosed()
                    .subscribe((message: string) => {

                        if (!message) {
                            return;
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => {
                            this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                        }, 200);

                    });
                
            });

    }

}
