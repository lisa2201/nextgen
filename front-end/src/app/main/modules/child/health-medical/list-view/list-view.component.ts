import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { HealthMedical } from '../health-medical.model';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { HealthMedicalService } from '../services/health-medical.service';
import { NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NewOrEditAllergyComponent } from '../new-or-edit-allergy/new-or-edit-allergy.component';

@Component({
  selector: 'allergy-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 300 }),
      fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class AllergyListViewComponent implements OnInit {

  // Private
  private _unsubscribeAll: Subject<any>;
  
  // allergies: any;
  buttonLoader: boolean;
  dialogRef: any;
  allergies: HealthMedical[];

  pageIndex: any;
  pageSize: any;
  pageSizeChanger: boolean;
  pageSizeOptions: number[];
  total = 0;
  tableLoading: boolean;
  mobilePagination: boolean;
  searchInput: FormControl;
  confirmModal: any;

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
    private _healthService: HealthMedicalService,
    private _modalService: NzModalService,
    private _commonService: CommonService,
    private _authService: AuthService
  ) {

    // Set defaults
    this.buttonLoader = false;

    this.pageSizeChanger = true;
    this.tableLoading = false;
    this.mobilePagination = false;

    this.pageSize = this._healthService.defaultPageSize;
    this.pageIndex = this._healthService.defaultPageIndex;
    this.pageSizeOptions = this._healthService.defaultPageSizeOptions;
    this.searchInput = new FormControl({ value: null, disabled: false });

    // Set the private defaults
    this._unsubscribeAll = new Subject();
  }

  ngOnInit() {

    // Subscribe to allergy list changes
    this._healthService
      .onAllergyChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        this._logger.debug('[allergies]', response);

        this.allergies = response.items;
        this.total = response.totalDisplay;

      });

    // Subscribe to table loader changes
    this._healthService
      .onTableLoaderChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(value => {

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
          this._healthService.onSearchTextChanged.next(searchText);
        }
      });
  }

    /**
     * clear search
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent, _emit: boolean = true): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

  /**
 * get items for table
 *
 * @param {boolean} [reset=false]
 */
  onTableChange(reset: boolean = false): void {
    if (reset) {
      this.pageIndex = this._healthService.defaultPageIndex;
    }

    this._healthService.onPaginationChanged.next({
      page: this.pageIndex,
      size: this.pageSize
    });
  }

  editDialog(item: HealthMedical, e: MouseEvent): void
  {
    e.preventDefault();
      this.buttonLoader = true;

      this._healthService
          .getAllergyTypes()
          .pipe(
              takeUntil(this._unsubscribeAll),
              finalize(() => setTimeout(() => this.buttonLoader = false, 200))
          )

          .subscribe(
              response => {
                  if (_.isEmpty(response.allergyTypes)) { return; }
                  this.dialogRef = this._matDialog
                      .open(NewOrEditAllergyComponent,
                          {
                              panelClass: 'allergy-new-or-edit-dialog',
                              closeOnNavigation: true,
                              disableClose: true,
                              autoFocus: false,
                              data: {
                                  action: AppConst.modalActionTypes.EDIT,
                                  response: {
                                      allergyTypes: response.allergyTypes,
                                      childId: this._route.snapshot.params['id'],
                                      item: item
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
          );

    /*this.dialogRef = this._matDialog
    .open(NewOrEditAllergyComponent,
      {
        panelClass: 'allergy-new-or-edit-dialog',
        closeOnNavigation: true,
        disableClose: true,
        autoFocus: false,
        data: {
          action: AppConst.modalActionTypes.EDIT,
          response: {
            childId: this._route.snapshot.params['id'],
            item: item
          }
        }
      });*/




  }
  delete(item: HealthMedical, e: MouseEvent): void
  {
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
                    return new Promise((resolve, reject) =>
                    {
                        this._healthService
                            .deleteAllergy(item.id)
                            .pipe(
                              takeUntil(this._unsubscribeAll),
                              finalize(() => resolve())
                            )
                            .subscribe(
                                message =>
                                {
                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                    this.onTableChange(true);
                                },
                                error =>
                                {
                                    throw error;
                                }
                            );
                    });
                }
            }
        );
  }

}
