import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { BookingRequestService } from './services/booking-request.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { BranchAddDialogComponent } from '../../branch/dialogs/new/new.component';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs';
import {Child} from '../child.model';
import {ChildrenService} from '../services/children.service';

@Component({
  selector: 'child-booking-request',
  templateUrl: './booking-request.component.html',
  styleUrls: ['./booking-request.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})

export class BookingRequestComponent implements OnInit, OnDestroy {

  // Private
  private _unsubscribeAll: Subject<any>;

  bookings: any;
  buttonLoader: boolean;
  dialogRef: any;
  child: Child;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {NGXLogger} _bookingService
     * @param {Router} _route
     * @param _notification
     * @param _matDialog
     * @param _modalService
     * @param _commonService
     */
  constructor(
    private _logger: NGXLogger,
    private _router: Router,
    private _bookingService: BookingRequestService,
    private _route: ActivatedRoute,
    private _notification: NotificationService,
    public _matDialog: MatDialog,
    private _modalService: NzModalService,
    private _commonService: CommonService,
  ) {
    // Set defaults
    this.buttonLoader = false;
    this.bookings = this._route.snapshot.data['bookingRequests'];
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
      this._bookingService
          .onChildChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((child: any) =>
          {
              this._logger.debug('[child booking request - child]', child);

              this.child = child;
          });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  trackByFn(index: number, item: any): number {
    return index;
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
   * Add new booking request
   */
  addDialog(e: MouseEvent): void {
    e.preventDefault();

    this.buttonLoader = true;

    Promise.all([
      this._commonService.getTimeZones(),
      this._commonService.getCountries(),
    ])
      .then(([timezones, countries]: [any, any]) => {
        setTimeout(() => this.buttonLoader = false, 200);

        this.dialogRef = this._matDialog
          .open(BranchAddDialogComponent,
            {
              panelClass: 'branch-new-dialog',
              closeOnNavigation: true,
              disableClose: true,
              autoFocus: false,
              data: {
                action: AppConst.modalActionTypes.NEW,
                timezones: timezones,
                countries: countries,
                response: {}
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
      });
  }

    getChildProfileImage(item) : string
    {
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }

}
