import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ReturnFeeReductionService } from '../services/return-fee-reduction.service';
import { ReturnFeeReduction } from '../return-fee-reduction.model';
import { CancleReturnFeeComponent } from '../dialogs/add-or-edit/cancle-return-fee/cancle-return-fee.component';
import { Child } from '../../child.model';
import { AddOrEditComponent } from '../dialogs/add-or-edit/add-or-edit.component';

@Component({
  selector: 'return-fee-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class ListViewComponent implements OnInit {

  // Private
  private _unsubscribeAll: Subject<any>;

  // allergies: any;
  buttonLoader: boolean;
  dialogRef: any;
  returnFeeData: ReturnFeeReduction[];

  ApiData: any;
  tableLoading: boolean;
  mobilePagination: boolean;
  searchInput: FormControl;
  confirmModal: any;
  syncerror: string;

  @Input() selected: Child;

  /**
   * Constructor
   * 
   * @param {NGXLogger} _logger
   * @param {Router} _router
   * @param {NGXLogger} _bookingService
   * @param {Router} _route
   */
  constructor(
    private _logger: NGXLogger,
    private _router: Router,
    private _route: ActivatedRoute,
    private _notification: NotificationService,
    public _matDialog: MatDialog,
    private _returnFeeService: ReturnFeeReductionService,
    private _modalService: NzModalService,
    private _commonService: CommonService,
    private _authService: AuthService
  ) {

    // Set defaults
    this.buttonLoader = false;

    this.tableLoading = false;
    this.mobilePagination = false;

    this.searchInput = new FormControl({ value: null, disabled: false });

    // Set the private defaults
    this._unsubscribeAll = new Subject();

    this.syncerror = 'Error in create';
  }

  ngOnInit() {

    // Subscribe to return fee list changes
    this._returnFeeService
      .onFeeChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        this._logger.debug('[return fee reduction]', response);

        this.returnFeeData = response.items;
        this.ApiData = response.apiData;

      });

    // Subscribe to table loader changes
    this._returnFeeService
      .onTableLoaderChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(value => {
        this._logger.debug('[table loader]', value);

        this.tableLoading = value;
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
          this._returnFeeService.onSearchTextChanged.next(searchText);
        }
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
  /**
   * clear search
   *
   * @param {MouseEvent} e
   */
  clearSearch(e: MouseEvent, _emit: boolean = true): void {
    if (!_.isNull(e)) { e.preventDefault(); }

    this.searchInput.patchValue('', { emitEvent: _emit });
  }

  delete(item, e: MouseEvent): void {
    e.preventDefault();

    this.dialogRef = this._matDialog
      .open(CancleReturnFeeComponent,
        {
          panelClass: 'return-fee-reduction-cancel-dialog',
          closeOnNavigation: true,
          disableClose: true,
          autoFocus: false,
          data: {
            action: AppConst.modalActionTypes.EDIT,
            response: {
              item: item,
              child: this.selected
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

        setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
      });

  }

  editDialog(item: ReturnFeeReduction, e: MouseEvent) {
    e.preventDefault();

    this.dialogRef = this._matDialog
      .open(AddOrEditComponent,
        {
          panelClass: 'return-fee-reduction-new-or-edit-dialog',
          closeOnNavigation: true,
          disableClose: true,
          autoFocus: false,
          data: {
            action: AppConst.modalActionTypes.EDIT,
            response: {
              item: item,
              child: this.selected
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

        setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
      });
  }

}
