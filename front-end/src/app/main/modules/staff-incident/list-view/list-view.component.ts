import {Component, Injectable, OnDestroy, OnInit} from '@angular/core';
import {StaffIncident} from '../staff-incident.model';
import {StaffIncidentService} from '../services/staff-incident.service';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {takeUntil, debounceTime, distinctUntilChanged, finalize} from 'rxjs/operators';
import {NzModalRef, NzModalService, slideMotion} from 'ng-zorro-antd';
import * as _ from 'lodash';
import {FormControl} from '@angular/forms';
import {Subject} from 'rxjs';
import {NGXLogger} from 'ngx-logger';
import {AppConst} from 'app/shared/AppConst';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {MatDialog} from '@angular/material/dialog';
import {ViewIncidentComponent} from '../dialogs/view-incident/view-incident.component';
import {NewOrEditComponent} from '../dialogs/new-or-edit/new-or-edit.component';
import {FuseSidebarService} from '@fuse/components/sidebar/sidebar.service';

@Injectable()
@Component({
    selector: 'staff-incident-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    animations: [
        fuseAnimations,
        slideMotion,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    tableLoading: boolean;
    buttonLoader: boolean;
    mobilePagination: boolean;
    total: number;

    dialogRef: any;    
    searchInput: FormControl;
    incidents: StaffIncident[];
    confirmModal: NzModalRef;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _staffIncidentService: StaffIncidentService,
        private _notification: NotificationService,
        private _fuseSidebarService: FuseSidebarService
    ) {

        // Set defaults
        this.pageIndex = this._staffIncidentService.defaultPageIndex;
        this.pageSize = this._staffIncidentService.defaultPageSize;
        this.pageSizeChanger = true;
        this.pageSizeOptions = this._staffIncidentService.defaultPageSizeOptions;
        this.tableLoading = false;
        this.buttonLoader = false;      
        this.mobilePagination = false;
  
        this.searchInput = new FormControl({value: null, disabled: false});

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        this._staffIncidentService
            .onIncidentsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {                
                this.incidents = response.items;
                console.log(this.incidents);
                this.total = response.totalDisplay;
            });

        this._staffIncidentService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this.tableLoading = value;
            });

        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => {
                if (!_.isNull(searchText)) {
                    this._staffIncidentService.onSearchTextChanged.next(searchText);
                }
            });
        
    }

    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
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

        this.searchInput.patchValue('', {emitEvent: _emit});
    }


    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._staffIncidentService.defaultPageIndex;
        }

        this._staffIncidentService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * view incident
     *
     * @param {StaffIncident} item
     * @param {MouseEvent} e
     */
    viewIncident(item: StaffIncident, e: MouseEvent): void{
        e.preventDefault();
        this.buttonLoader = true;
        // item.isLoading = true;

        this._staffIncidentService.getUsers(null)
        .pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => setTimeout(() => this.buttonLoader = false, 200))
        )
        .subscribe(
            stafflist => {
                // if (_.isEmpty(depends)) { return; }

                this.dialogRef = this._matDialog
                    .open(ViewIncidentComponent,
                    {
                        panelClass: 'incident-view',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            staff: stafflist,
                            incident: item
                        }
                    });

                this.dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(message => {
                        if (!message) {
                        return;
                    }

                    this._notification.clearSnackBar();
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });
            }
        );
    }

    /**
     * Print incident
     *
     * @param {StaffIncident} item
     * @param {MouseEvent} e
     */
     printIncident(item: StaffIncident, e: MouseEvent): void{
        e.preventDefault();
        this.buttonLoader = true;
        // item.isLoading = true;

        this._staffIncidentService.getUsers(null)
        .pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => setTimeout(() => this.buttonLoader = false, 200))
        )
        .subscribe(
            stafflist => {
                this._staffIncidentService.printReport(item, stafflist);                         
            }
        );
    }

    /**
     * Edit incident
     *
     * @param {Role} item
     * @param {MouseEvent} e
     */
    editIncident(item: StaffIncident, e: MouseEvent): void{
        e.preventDefault();
        this.buttonLoader = true;
        // item.isLoading = true;

        this._staffIncidentService.getUsers(null)
        .pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => setTimeout(() => this.buttonLoader = false, 200))
        )
        .subscribe(
            stafflist => {
                // if (_.isEmpty(depends)) { return; }

                this.dialogRef = this._matDialog
                    .open(NewOrEditComponent,
                    {
                        panelClass: 'incident-new-or-edit',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.EDIT,
                            staff: stafflist,
                            incident: item
                        }
                    });

                this.dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(message => {
                        if (!message) {
                        return;
                    }

                    this._notification.clearSnackBar();
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });
            }
        );
    }

    /**
    * Delete incident
    *
    * @param {StaffIncident} item
    * @param {MouseEvent} e
    */
    delete(item: StaffIncident, e: MouseEvent): void {

        e.preventDefault();
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this._staffIncidentService
                                .delete(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve('null'))
                                )
                                .subscribe(
                                    message => setTimeout(() =>
                                        this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200,
                                    ),
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

}
