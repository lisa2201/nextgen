import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildrenService } from '../services/children.service';
import { CommonService } from 'app/shared/service/common.service';

import { Child } from '../child.model';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector: 'child-list-view',
    templateUrl: './child-list.component.html',
    styleUrls: ['./child-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildListComponent implements OnInit, OnDestroy {
    
    // Private
    private _unsubscribeAll: Subject<any>;

    childrenList: Child[];
    currentChild: Child;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    paginationMeta: any;
    total: number;
    listViewLoading: boolean;
    disableScroll: boolean;
    detailContentLoading: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildrenService} _childrenService
     */
    constructor(
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _childrenService: ChildrenService
    )
    {
        // Set default values
        this.total = 0;
        this.pageSizeChanger = true;
        this.listViewLoading = false;
        this.disableScroll = false;
        this.detailContentLoading = false;

        this.pageSize = this._childrenService.pagination ? this._childrenService.pagination.size : this._childrenService.defaultPageSize;
        this.pageIndex = this._childrenService.pagination ? this._childrenService.pagination.page : this._childrenService.defaultPageIndex;
        this.pageSizeOptions = this._childrenService.defaultPageSizeOptions;
        this.paginationMeta = this._childrenService.paginationMeta ? this._childrenService.paginationMeta : null;

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
        this._logger.debug('child list view !!!');

        // Subscribe to children list changes
        this._childrenService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[list view - children]', response);

                this.childrenList = response.items;
                this.total = response.totalDisplay;
                this.paginationMeta = response.meta;

                // set previously selected child
                this.setLastSelectedChild();

                // update list view scroll
                this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);

                this.updateListScroll();

                // scroll to selected item
                setTimeout(() => this.scrollToSelectedItem(this.currentChild), 250);
            });
        
        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild =>
            {
                this._logger.debug('[list view - current child]', currentChild);

                this.currentChild = (!currentChild) ? null : currentChild;
            });
        
        // Subscribe to view loader changes
        this._childrenService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.listViewLoading = value);

        // Subscribe to detail view loader changes
        this._childrenService
            .onDetailViewContentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.detailContentLoading = value);
        
        // Subscribe to filter changes
        this._childrenService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                // reset page index
                this.pageIndex = this._childrenService.defaultPageIndex;
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    getChild(e: MouseEvent, id: string): void
    {
        e.preventDefault();

        if (this.listViewLoading || this.detailContentLoading || (this.currentChild && this.currentChild.id === id))
        {
            return;
        }

        this._childrenService.setCurrentChild(id);

        // trigger detail view scroll changes
        this._childrenService.onListViewItemChanged.next();
    }

    /**
     * set previously selected child
     */
    setLastSelectedChild(): void
    {
        if (this._childrenService.currentChild)
        {
            setTimeout(() => this._childrenService.setCurrentChild(this._childrenService.currentChild.id));
        }
    }

    updateListScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    scrollToSelectedItem(child: Child): void
    {
        if ( this.directiveScroll && !_.isNull(child) && child)
        {
            setTimeout(() => this.directiveScroll.scrollToElement('.cl-' + child.attrId), 100);
        }
    }

    previousPage(e: MouseEvent): void
    {
        e.preventDefault();

        if (_.isNull(this.paginationMeta) || this.total === 0 || this.pageIndex === 1 || this.listViewLoading)
        {
            return;    
        }

        this.pageIndex -= 1;

        this._childrenService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    nextPage(e: MouseEvent): void
    {
        e.preventDefault();

        if (_.isNull(this.paginationMeta) || this.total === 0 || this.pageIndex === this.getLastIndex || this.listViewLoading || this.detailContentLoading)
        {
            return;    
        }

        this.pageIndex += 1;
    
        this._childrenService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    get getLastIndex(): number
    {
        return Math.ceil(this.total / this.pageSize);
    }

    getEnrolmentClassName(item: Child): string
    {
        let className = '';

        if (item.getEnrolment().isEnrolmentCeased() || item.getEnrolment().hasError())
        {
            className = 'error';
        }
        else if (item.getEnrolment().enrolmentClosed() || item.getEnrolment().isEnrolmentReEnrolled())
        {
            className = 'warning';
        }
        else if (item.getEnrolment().isEnrolmentActive())
        {
            className = 'success';
        }

        return className;
    }

    getChildProfileImage(item: any) : string
    {
        return item.image 
            ? this._commonService.getS3FullLinkforProfileImage(item.image)
            : `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`
    }
}
