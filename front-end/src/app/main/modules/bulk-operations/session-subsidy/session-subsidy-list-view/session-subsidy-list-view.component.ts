import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subsidy } from '../session-subsidy.model';
import { NGXLogger } from 'ngx-logger';
import { SessionSubsidyService } from '../services/session-subsidy.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { SusbsidyDetailDialogComponent } from '../dialogs/susbsidy-detail-dialog/susbsidy-detail-dialog.component';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
    selector: 'app-session-subsidy-list-view',
    templateUrl: './session-subsidy-list-view.component.html',
    styleUrls: ['./session-subsidy-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSubsidyListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    sessionSubsidyList: Subsidy[] = [];

    tableLoading: boolean;
    dialogRef: any;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _sessionSubsidyService: SessionSubsidyService,
        private _fuseSidebarService: FuseSidebarService,
        private _matDialog: MatDialog,
        private _router: Router
    ) {
        // set default values

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

        this._logger.debug('finance session subsidy list view!');

        // Subscribe to payment history list changes
        this._sessionSubsidyService
            .onSubsidyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[session-subsidy]', response);

                this.sessionSubsidyList = response;

                this.updateTableScroll.next();
            });

        // Subscribe to table loader changes
        this._sessionSubsidyService
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

    getChildName(data: Subsidy): string {
        return data.child ? `${data.child?.f_name} ${data.child?.l_name}` : '';
    }

    goToChildPage(event: MouseEvent, data: Subsidy): void {
        event.preventDefault();
        
        if (data.child) {
            this._router.navigate(['/manage-children/child', data.child.id]);
        }
    }

    openDetail(event: MouseEvent, data: any): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(SusbsidyDetailDialogComponent,
                {
                    panelClass: 'ccs-subsidy-details-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                        detail: data
                    }
                });

    }
}
