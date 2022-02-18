import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil } from 'rxjs/operators';
import { NzModalRef } from 'ng-zorro-antd';
import { Branch } from '../../branch/branch.model';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { QueryMessageService } from '../../message/service/message.service';
import { NGXLogger } from 'ngx-logger';
import { InnovativeSolutionCasesService } from '../service/innovative-solution-cases.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'innovative-solution-cases-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InnovativeSolutionCasesListViewComponent implements OnInit, OnDestroy {
    pageIndex: any;
    dialogRef: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    listData: [];
    confirmModal: NzModalRef;
    showEffectiveDateColumn: boolean;
    branchList: Branch[];
    clearService: boolean;

    lastPage: boolean;
    currentPage: number;
    pageSize: number;

    defaultPageSizeOptions: number[];
    

    searchInput: FormControl;
    _unsubscribeAll: Subject<any>;
    isLoadingData: boolean;
    buttonLoader: boolean;
    @Output()
    updateTableScroll: EventEmitter<any>;
    
  constructor(
    private _fuseSidebarService: FuseSidebarService,
    private _logger: NGXLogger,
    private _innovativeSolutionCaseService: InnovativeSolutionCasesService,
    private _router: Router,
    private _route: ActivatedRoute
  ) { 
      this.tableLoading = false;
      this.searchInput = new FormControl({ value: null, disabled: false });
      this._unsubscribeAll = new Subject();
      this.updateTableScroll = new EventEmitter();
      this.listData = [];
      this.clearService = true;
      this.defaultPageSizeOptions = [2, 3, 5, 10];
  }

  ngOnInit() {

      this._logger.debug('innovative sollution !!!');
      this._innovativeSolutionCaseService.caseListChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((caseListData: any) => {
              this._logger.debug('[caseListData data]', caseListData);

            //   this.caseList =  caseListData.items ? caseListData.items : [];
              this.listData =  caseListData.items ? caseListData.items : [];

              this.lastPage = caseListData.lastPage ? caseListData.lastPage : true;

              this.updateTableScroll.next();
          });

      this._innovativeSolutionCaseService.pageData
        
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((pageData) => {
            console.log('page data', pageData);
            this.lastPage = pageData.lastPage;
            this.currentPage = pageData.currentPage;
            this.pageSize = pageData.pageSize;
          });

      // Subscribe to table loader changes
      this._innovativeSolutionCaseService
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

onTableChange(reset: boolean = false): void
{
    // if (reset)
    // {
    //     this.pageIndex = this._invitationService.defaultPageIndex;
    // }

    // this._invitationService.onPaginationChanged.next({
    //     page: this.pageIndex,
    //     size: this.pageSize
    // });
}

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        if (this.clearService) {
            this._logger.debug('Reset  Case Service Data');
            this._innovativeSolutionCaseService.unsubscribeOptions();
        }
    }

    nextPage(event: MouseEvent): void {
        event.preventDefault();
        this._innovativeSolutionCaseService.nextPage();
    }

    previousPage(event: MouseEvent): void {
        event.preventDefault();
        this._innovativeSolutionCaseService.previousPage();
    }

    goToDetail(event: MouseEvent, id: string): void {
        event.preventDefault();
        this.clearService = false;
        this._router.navigate([id, 'view'], { relativeTo: this._route });
    }

    goToClaims(event: MouseEvent, id: string): void {
        event.preventDefault();
        this.clearService = false;
        this._router.navigate(['innovative-solution-cases-claims'], { queryParams: {caseId: id} });
    }

    onPageSizeChange(pageSize: number): void {
        this._innovativeSolutionCaseService.onPageSizeChanged.next(pageSize);
    }

    queryData(event: MouseEvent): void {

        event.preventDefault();

        this._innovativeSolutionCaseService.onQueryByFilter.next();

    }
}
