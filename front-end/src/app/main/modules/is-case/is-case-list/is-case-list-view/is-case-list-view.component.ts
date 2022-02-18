import { Component, OnInit, OnDestroy, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { IsCaseService } from '../../services/is-case.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ISCase } from '../../is-case.model';
import { MatDialog } from '@angular/material/dialog';
import { CreateIsClaimDialogComponent } from '../../dialogs/create-is-claim-dialog/create-is-claim-dialog.component';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-is-case-list-view',
    templateUrl: './is-case-list-view.component.html',
    styleUrls: ['./is-case-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    isCasesList: ISCase[];

    dialogRef: any;
    tableLoading: boolean;
    lastPage: boolean;
    currentPage: number;
    pageSize: number;
    buttonLoader: boolean;

    defaultPageSizeOptions: number[];

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _fuseSidebarService: FuseSidebarService,
        private _isCaseService: IsCaseService,
        private _matDialog: MatDialog,
        private _router: Router,
        private _notification: NotificationService,
        private _route: ActivatedRoute
    ) {
        // set default values
        this.tableLoading = false;
        this.buttonLoader = false;
        this.isCasesList = [];

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

        this._logger.debug('is cases list view!');

        // Subscribe to IS case list 
        this._isCaseService
            .onISCasesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[IS Cases]', response);

                this.isCasesList = response.items ? response.items : [];
                this.lastPage = response.lastPage ? response.lastPage : true;

                this.updateTableScroll.next();
            });

        this._isCaseService
            .pageData
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageData) => {
                this.lastPage = pageData.lastPage;
                this.currentPage = pageData.currentPage;
                this.pageSize = pageData.pageSize;
            });

        // Subscribe to table loader changes
        this._isCaseService
            .onTableLoaderChanged
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

        if (this._router.routerState.snapshot.url.includes('inclusion-support') === false) {
            this._logger.debug('Clear IS Case Service Data');
            this._isCaseService.unsubscribeOptions();
        }

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
     * Toggle sidebar
     * @param {string} name 
     */
    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    queryData(event: MouseEvent): void {

        event.preventDefault();

        this._isCaseService.onISCaseQueryByFilter.next();

    }

    nextPage(event: MouseEvent): void {
        event.preventDefault();
        this._isCaseService.nextPage();
    }

    previousPage(event: MouseEvent): void {
        event.preventDefault();
        this._isCaseService.previousPage();
    }

    goToDetail(event: MouseEvent, id: string): void {
        event.preventDefault();
        this._router.navigate([id], { relativeTo: this._route });
    }

    goToClaims(event: MouseEvent, id: string): void {
        event.preventDefault();
        this._router.navigate(['/inclusion-support', 'claims'], { queryParams: {caseId: id} });
    }

    onPageSizeChange(pageSize: number): void {
        this._isCaseService.onPageSizeChanged.next(pageSize);
    }

    openAddISClaimDialog(event: MouseEvent, index: number): void {

        event.preventDefault();
        
        this.tableLoading = true;

        const resObservable = forkJoin([
            this._isCaseService.addISCaseClaimDependency(this.isCasesList[index])
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
                                isCase: this.isCasesList[index],
                                children: depData.children ? depData.children : [],
                                educators: depData.educators ? depData.educators : [],
                                edit: false,
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
