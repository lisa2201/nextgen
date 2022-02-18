import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { CommonService } from 'app/shared/service/common.service';
import { BusListService } from './services/bus-list.service';
import {combineLatest, Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, finalize, takeUntil} from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { valueExists } from 'app/shared/validators/asynValidator';
import { NotificationService } from 'app/shared/service/notification.service';
import {AuthService} from '../../../../shared/service/auth.service';
import {AppConst} from '../../../../shared/AppConst';
import {ChildAddDialogComponent} from '../../child/dialogs/new/new.component';
import {MatDialog} from '@angular/material/dialog';
import {NewOrEditBusComponent} from './dialogs/new-or-edit-bus/new-or-edit-bus.component';
import {NewOrEditSchoolComponent} from './dialogs/new-or-edit-school/new-or-edit-school.component';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import * as _ from 'lodash';
import {ViewChildrenInBusComponent} from './dialogs/view-children-in-bus/view-children-in-bus.component';
import {ChildrenService} from '../../child/services/children.service';
import {ViewChildrenInSchoolComponent} from './dialogs/view-children-in-school/view-children-in-school.component';
import { School } from './school-list.model';
import { Bus } from './bus-list.model';

@Component({
    selector: 'bus-list',
    templateUrl: './bus-list.component.html',
    styleUrls: ['./bus-list.component.scss'],
    animations: [
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 300 }),
      fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BusListComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    schoolListForm: FormGroup;
    dialogRef: any;
    busList: Bus[];
    schoolList: School[];
    confirmModal: NzModalRef;
    pageIndex: any;
    pageSize: any;
    pageIndexSchool: any;
    pageSizeSchool: any;
    pageSizeChanger = true;
    pageSizeOptions: number[];
    totalSchool = 0;
    totalDisplaySchool = 0;
    total = 0;
    totalDisplay = 0;
    mobilePagination = false;
    searchInputSchool: FormControl;
    searchInput: FormControl;
    tableLoading: boolean;

    constructor(
      private _commonService: CommonService,
      private _busListService: BusListService,
      private _childrenService: ChildrenService,
      private _notification: NotificationService,
      private _auth: AuthService,
      private _matDialog: MatDialog,
      private _modalService: NzModalService,
    ) {
      this._unsubscribeAll = new Subject();
      this.pageSize = this._busListService.defaultPageSize;
      this.pageIndex = this._busListService.defaultPageIndex;
      this.pageSizeSchool = this._busListService.defaultPageSize;
      this.pageIndexSchool = this._busListService.defaultPageIndex;
      this.pageSizeOptions = this._busListService.defaultPageSizeOptions;
      this.searchInputSchool = new FormControl({ value: null, disabled: false });
      this.searchInput = new FormControl({ value: null, disabled: false });
      this.tableLoading = false;

    }

    ngOnInit(): void {


      this._busListService
        .onBusListChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this.busList = response.items;
                this.total = response.total;
                this.totalDisplay = response.totalDisplay ? response.totalDisplay : 1;
            });

        this._busListService
            .onSchoolListChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                console.log('check school',response);
                
                this.schoolList = response.items;
                this.totalSchool = response.total;
                this.totalDisplaySchool = response.totalDisplay ? response.totalDisplay : 1;
            });

        // search input on change for school listview search
        this.searchInputSchool
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()

            )
            .subscribe(searchText => {

                if (!_.isNull(searchText)) {
                    this._busListService.onSchoolSearchTextChanged.next(searchText);
                }
                this.pageIndex = this._busListService.defaultPageIndex;
            });

        // search input on change for bus listview search
        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()

            )
            .subscribe(searchText => {

                if (!_.isNull(searchText)) {
                    this._busListService.onSearchTextChanged.next(searchText);
                }
                this.pageIndex = this._busListService.defaultPageIndex;
            });
    }


    /**
     * Form submit handler
     */
    clearSearch(e: MouseEvent): void {

        e.preventDefault();
        this.searchInput = null;

    }

    onTableChange(reset: boolean= false): void {
        if (reset) {
            this.pageIndex = this._busListService.defaultPageIndex;
        }

        this._busListService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    onTableChangeSchool(reset: boolean= false): void {
        if (reset) {
            this.pageIndexSchool = this._busListService.defaultPageIndex;
        }

        this._busListService.onSchoolPaginationChanged.next({
            page: this.pageIndexSchool,
            size: this.pageSizeSchool
        });
    }

    /**
     * Add new bus item
     */
    addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(NewOrEditBusComponent,
                {
                    panelClass: 'new-or-edit-bus',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {}
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message =>
            {
                if ( !message )
                {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }

    addSchoolDialog(e : MouseEvent): void
    {
        e.preventDefault();

        this.tableLoading = true;
        this._busListService.getBusList(true).then(results => {
            this.tableLoading = false;
            this.dialogRef = this._matDialog
                .open(NewOrEditSchoolComponent,
                    {
                        panelClass: 'new-or-edit-school',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.NEW,
                            busList: this.busList,
                            response: {}
                        }
                    });

            this.dialogRef
                .afterClosed()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(message =>
                {
                    this.tableLoading = false;

                    this._busListService.onPaginationChanged.next({
                        page: this.pageIndex,
                        size: this.pageSize
                    });

                    if ( !message )
                    {
                        return;
                    }

                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });
        });
    }

    editBus(e: MouseEvent, item: Bus): void
    {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(NewOrEditBusComponent,
                {
                    panelClass: 'new-or-edit-bus',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        response: {
                            bus: item,
                        }
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message =>
            {
                if ( !message )
                {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }

    viewChildrenByBus(e: MouseEvent, item: Bus): void
    {
        e.preventDefault();
        this.tableLoading = true;
        // tslint:disable-next-line: deprecation
        combineLatest(
            this._busListService.getChildrenAndSchoolsByBus(item.id),
            // this._childrenService.getChildrenList()
        )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.tableLoading = false, 200))
            )
            .subscribe(
                ([busChildrenAndSchools]) => {
                    this.dialogRef = this._matDialog
                        .open(ViewChildrenInBusComponent,
                            {
                                panelClass: 'buslist-view-children-in-bus',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    response: {
                                        selectedChildren: busChildrenAndSchools.childList,
                                        // allChildren: allChildren,
                                        schoolList: busChildrenAndSchools.schoolList,
                                        bus: item
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

    editSchool(e: MouseEvent, item: School): void
    {
        e.preventDefault();
        this.tableLoading = true;

        this._busListService.getBusList(true).then(results => {
            this.tableLoading = false;
            this.dialogRef = this._matDialog
                .open(NewOrEditSchoolComponent,
                    {
                        panelClass: 'new-or-edit-school',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.EDIT,
                            busList: this.busList,
                            response: {
                                school: item
                            }
                        }
                    });

            this.dialogRef
                .afterClosed()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(message =>
                {
                    this._busListService.onPaginationChanged.next({
                        page: this.pageIndex,
                        size: this.pageSize
                    });
                    if ( !message )
                    {
                        return;
                        this.tableLoading = false;
                    }

                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });
        });

    }

    viewChildrenBySchool(e: MouseEvent, item: School): void
    {
        e.preventDefault();
        this.tableLoading = true;
        // tslint:disable-next-line: deprecation
        combineLatest(
            this._busListService.getChildrenBySchool(item.id),
           // this._childrenService.getChildrenList()
        )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.tableLoading = false, 200))
            )
            .subscribe(
                ([schoolChildren]) => {
                    this.dialogRef = this._matDialog
                        .open(ViewChildrenInSchoolComponent,
                            {
                                panelClass: 'buslist-view-children-in-school',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    response: {
                                        selectedChildren: schoolChildren.childList,
                                        // allChildren: allChildren,
                                        school: item
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

    deleteBus(e: MouseEvent, item): void
    {
        e.preventDefault();
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete this bus?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                bus: item
                            };


                            this._busListService
                                .deleteBus(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => {
                                            this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                                        }, 200);
                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }


    deleteSchool(e: MouseEvent, item): void
    {
        e.preventDefault();
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete this school?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                school: item
                            };


                            this._busListService
                                .deleteSchool(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => {
                                            this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                                        }, 200);
                                    },
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
