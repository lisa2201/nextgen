import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs';
import { AddOrEditComponent } from './dialogs/add-or-edit/add-or-edit.component';
import { ReturnFeeReductionService } from './services/return-fee-reduction.service';
import { NGXLogger } from 'ngx-logger';
import { Child } from '../child.model';
import { browserRefresh } from 'app/app.component';
import { ChildrenService } from '../services/children.service';
import {CommonService} from '../../../../shared/service/common.service';

@Component({
  selector: 'child-return-fee-reduction',
  templateUrl: './return-fee-reduction.component.html',
  styleUrls: ['./return-fee-reduction.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class ReturnFeeReductionComponent implements OnInit, OnDestroy {

  // Private
  private _unsubscribeAll: Subject<any>;

  dialogRef: any;
  child: Child;
  buttonLoader: boolean;

    /**
     * Constructor
     *
     * @param _logger
     * @param {Router} _router
     * @param {Router} _route
     * @param {Router} _notification
     * @param {Router} _matDialog
     * @param _childrenServices
     * @param _returnFeeReductionService
     * @param _commonService
     */
  constructor(

    private _logger: NGXLogger,
    private _router: Router,
    private _route: ActivatedRoute,
    private _notification: NotificationService,
    private _matDialog: MatDialog,
    private _childrenServices: ChildrenService,
    private _returnFeeReductionService: ReturnFeeReductionService,
    private _commonService: CommonService,
  ) {

    this.buttonLoader = false;
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {

    // Subscribe to child changes
    this._returnFeeReductionService
      .onChildChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((child: any) => {
        this._logger.debug('[return fee reduction]', child);

        this.child = child;

        if (browserRefresh) {
          this._childrenServices.setDefaultCurrentChild(this.child);
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

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Add new allergy
   */
  addDialog(e: MouseEvent): void {
    e.preventDefault();

    this.dialogRef = this._matDialog
      .open(AddOrEditComponent,
        {
          panelClass: 'return-fee-reduction-new-or-edit-dialog',
          closeOnNavigation: true,
          disableClose: true,
          autoFocus: false,
          data: {
            action: AppConst.modalActionTypes.NEW,
            response: {
              child: this.child
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

  /**
* go back
*
* @param {MouseEvent} e
*/
  onBack(e: MouseEvent): void {
    e.preventDefault();

    this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
  }

    getChildProfileImage(item) : string
    {
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
}
