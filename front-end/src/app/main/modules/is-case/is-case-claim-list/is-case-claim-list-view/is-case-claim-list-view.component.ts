import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { ISCaseClaim } from '../../is-case-claim.model';
import { NGXLogger } from 'ngx-logger';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { IsCaseService } from '../../services/is-case.service';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil, finalize } from 'rxjs/operators';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';

@Component({
    selector: 'app-is-case-claim-list-view',
    templateUrl: './is-case-claim-list-view.component.html',
    styleUrls: ['./is-case-claim-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseClaimListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    isCasesClaimList: ISCaseClaim[];

    tableLoading: boolean;
    lastPage: boolean;
    currentPage: number;
    pageSize: number;
    buttonLoader: boolean;

    confirmModal: NzModalRef;

    defaultPageSizeOptions: number[];

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _fuseSidebarService: FuseSidebarService,
        private _isCaseService: IsCaseService,
        private _router: Router,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _route: ActivatedRoute
    ) {
        // set default values
        this.tableLoading = false;
        this.buttonLoader = false;
        this.isCasesClaimList = [];

        this.defaultPageSizeOptions = [5, 10, 20];

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

        this._logger.debug('is case claim list view!');

        // Subscribe to IS case claim list 
        this._isCaseService
            .onISCaseClaimsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: {items: ISCaseClaim[], lastPage: boolean}) => {
                this._logger.debug('[IS Cases]', response);

                this.isCasesClaimList = response.items ? response.items : [];
                this.lastPage = response.lastPage ? response.lastPage : true;

                this.updateTableScroll.next();
            });

        this._isCaseService
            .isCaseClaimsPageData
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageData) => {
                this.lastPage = pageData.lastPage;
                this.currentPage = pageData.currentPage;
                this.pageSize = pageData.pageSize;
            });

        // Subscribe to table loader changes
        this._isCaseService
            .onISCaseClaimsTableLoaderChanged
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
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------


    trackByFn(index: number, item: any): number {
        return index;
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    queryData(event: MouseEvent): void {

        event.preventDefault();

        this._isCaseService.onISCaseClaimsQueryByFilter.next();
        
    }

    nextPage(event: MouseEvent): void {
        event.preventDefault();
        this._isCaseService.isClaimNextPage();
    }

    previousPage(event: MouseEvent): void {
        event.preventDefault();
        this._isCaseService.isClaimPreviousPage();
    }

    goToDetail(event: MouseEvent, id: string): void {
        event.preventDefault();
        this._router.navigate([id], { relativeTo: this._route });
    }

    onPageSizeChange(pageSize: number): void {
        this._isCaseService.onISCaseClaimsPageSizeChanged.next(pageSize);
    }

    cancelClaim(event: MouseEvent, index: number): void {

        event.preventDefault();

        const sendData = {
            case_id: this.isCasesClaimList[index].ISCaseId,
            claim_id: this.isCasesClaimList[index].ISCaseClaimId
        };

        this.confirmModal = this._modalService.confirm({
            nzTitle: 'Are you sure want to cancel this claim?',
            nzContent: 'You are about to cancel this claim. This operation can not be undone. Would you like to proceed?',
            nzWrapClassName: 'vertical-center-modal',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => {
                return new Promise((resolve, reject) => {

                    this._isCaseService
                        .cancelISCaseClaim(sendData)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            message => {
                                setTimeout(() => {

                                    this._notification.displaySnackBar(
                                        message,
                                        NotifyType.SUCCESS
                                    );

                                    this.isCasesClaimList[index].ISCaseClaimStatus = 'Cancelled';

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

}
