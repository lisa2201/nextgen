import { Component, OnInit, ViewEncapsulation, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { takeUntil, finalize, shareReplay, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import { NzModalService, NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { NotificationService } from 'app/shared/service/notification.service';
import { AuthService } from 'app/shared/service/auth.service';

import { Room } from './models/room.model';
import { AppConst } from 'app/shared/AppConst';
import { NewOrEditComponent } from './dialogs/new-or-edit/new-or-edit.component';
import { RoomService } from './services/room.service';
import * as _ from 'lodash';
import { FormControl } from '@angular/forms';
import {DateTimeHelper} from '../../../utils/date-time.helper';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class RoomComponent implements OnInit, OnDestroy {
    roomList: Room[];
    cildren: any[];
    dissabled = false;
    buttonLoader: boolean;
    hasActionButton = true;
    private _unsubscribeAll: Subject<any>;
    dialogRef: any;
    updateButtonsTriggered: boolean;
    confirmModal: NzModalRef;
    searchInput: FormControl;
    isLoadingData =  false;

    mapOfSort: { [key: string]: any } = {
        title: null,
        branch: null,
        type: null
    };

    radioStyle = {
        display: 'block',
        height: '30px',
        lineHeight: '30px'
    };

    filterBy: { [key: string]: any } = {
        status: '0',
        text: ''
    };

    pageIndex: any;
    pageSize: any;
    pageSizeChanger = true;
    pageSizeOptions: number[];
    total = 0;
    totalDisplay = 0;
    tableLoading = false;
    mobilePagination = false;
    today: any;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {RoomService} _roomService
     * @param {MatDialog} _matDialog
     * @param {NzModalService} _modalService
     * @param {AuthService} _authService
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _roomService: RoomService,
        private _modalService: NzModalService,
        private _authService: AuthService
    ) {
        // Set defaults
        this.filterBy.status = '0';
        this.buttonLoader = false;
        this.isLoadingData = false;
        this.updateButtonsTriggered = false;
        this.pageSize = this._roomService.defaultPageSize;
        this.pageIndex = this._roomService.defaultPageIndex;
        this.pageSizeOptions = this._roomService.defaultPageSizeOptions;
        this.hasActionButton = this._authService.canAccess(['AC2', 'AC3'], 'N21');
        this.searchInput = new FormControl({ value: null, disabled: false });
        

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

        this.today = DateTimeHelper.now().tz(this._authService.getClient().timeZone).format(AppConst.dateTimeFormats.dateOnly);
        // Subscribe to room changes
        this._roomService
            .onRoomChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: any) => {

                this._logger.debug('[rooms-list]', rooms);
                this.roomList = rooms.items;
                this.total = rooms.total;
                this.totalDisplay = rooms.totalDisplay ? rooms.totalDisplay : 1;
                // tslint:disable-next-line: triple-equals
                this.dissabled = rooms.total == 0 ? true : false;
                this.isLoadingData = false;
                
                  
            });

        this._roomService
            .onRoomChangedUpdated
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: any) => {
                this._logger.debug('[room update]', rooms);
                this.roomList = rooms;
                this.total = rooms.total ? rooms.total : this.roomList.length;
                this.totalDisplay = rooms.totalDisplay ? rooms.totalDisplay : 1;
                this.isLoadingData = false;
                this.filterBy.status = this._roomService.filterBy;
            });

        // Subscribe to room status changes
        this._roomService
            .onRoomStatusChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res: any) => {
                this._logger.debug('[room update status]', res);
                this.roomList[res.position].setStatus(res.status);
                this.pageIndex = this._roomService.defaultPageIndex;
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
                this.isLoadingData = false;

                if (!_.isNull(searchText)) {
                    this._roomService.onSearchTextChanged.next(searchText);
                }
                this.pageIndex = this._roomService.defaultPageIndex;
            });

        this._roomService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.isLoadingData = value;

                this.searchInput[value ? 'disable' : 'enable']();
            });

        this._roomService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                // reset page index
                this.pageIndex = this._roomService.defaultPageIndex;
                this.filterBy.status = filter;
            });
        this._roomService
            .onRoomDelete
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                // reset page index
                this.pageIndex = this._roomService.defaultPageIndex;
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Close all dialogs
        this._matDialog.closeAll();

        if (this.confirmModal) {
            this.confirmModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._roomService.resetDeclarations();
    }

    addDialog(e: MouseEvent): void {

        e.preventDefault();
        this.buttonLoader = true;

        this._roomService
            .getDependency()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )

            .subscribe(
                depends => {
                    if (_.isEmpty(depends)) { return; }

                    this.dialogRef = this._matDialog
                        .open(NewOrEditComponent,
                            {
                                panelClass: 'room-new-or-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        depends: depends
                                    }
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
 * Edit room item
 *
 * @param {Role} item
 * @param {MouseEvent} e
 */
    editDialog(item: Room, e: MouseEvent): void {
        e.preventDefault();

        item.isLoading = true;

        // tslint:disable-next-line: deprecation
        combineLatest(
            this._roomService.getDependency(),
            this._roomService.getRoom(item.id)
        )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => item.isLoading = false, 200))
            )
            .subscribe(
                ([depends, rooms]) => {
                    this.dialogRef = this._matDialog
                        .open(NewOrEditComponent,
                            {
                                panelClass: 'room-new-or-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    response: {
                                        depends: depends,
                                        roomRes: rooms
                                        
                                    }
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
                },
                error => {
                    throw error;
                }
            );
    }


    /**
     * Update room status
     *
     * @param {Room} item
     * @param {MouseEvent} e
     * @memberof RoomComponent
     */
    updateStatus(item: Room, index: number, e: MouseEvent): void {
        e.preventDefault();

        // prevent from multiple clicks
        if (this.updateButtonsTriggered) {
            return;
        }

        this.updateButtonsTriggered = true;

        item.statusLoading = true;

        const sendObj = {
            id: item.id,
            status: !item.status
        };

        this._roomService
            .updateStatus(sendObj, index)
            .pipe(
                takeUntil(this._unsubscribeAll),
                shareReplay(),
                finalize(() => setTimeout(() => this.updateButtonsTriggered = item.statusLoading = false, 250))
            )
            .subscribe(
                message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                error => {
                    throw error;
                }
            );
    }


    /**
    * Delete role item
    *
    * @param {Room} item
    * @param {MouseEvent} e
    */
    delete(item: Room, e: MouseEvent): any {
        e.preventDefault();

        if (!item.isDeleteable) {
            item.isLoading = true;
            return setTimeout(
                () => {
                    item.isLoading = false;
                    this._notification.displaySnackBar(
                        'You can not delete a room that contains children..',
                        NotifyType.INFO
                    ); },
                   
                500
            );
        }
        
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
                            this._roomService
                                .deleteRoom(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    /**
    * reset sort
    *
    */
    // tslint:disable-next-line: typedef
    resetSort() {
        for (const key in this.mapOfSort) { this.mapOfSort[key] = null; }
    }

    /**
     * clear search 
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent): void {
        e.preventDefault();

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: true });
        this.isLoadingData = true;
    }

    changeFilter(): void {
        this._roomService.onFilterChanged.next(this.filterBy);
        this.isLoadingData = true;
        this.filterBy.status = this._roomService.filterBy;
    }

    /**
     * reset filters
     */
    resetFilters(): void {
        this.filterBy.status = '0';
    }

    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean= false): void {
        if (reset) {
            this.pageIndex = this._roomService.defaultPageIndex;
        }

        this._roomService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    active_child_count(cildren: any[]){

        function active(element, index, array) { 
            return (element.status == 1); 
        } 
                   
        return cildren.filter(active).length; 
    }

}
