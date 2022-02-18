import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Child } from '../../child.model';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ChildrenService } from '../../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import {MatDialog} from '@angular/material/dialog';
import { ChildSetUserComponent } from '../../modals/set-user/set-user.component';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { NewOrEditEmergencyComponent } from '../../emergency-view-holder/emergency-view/dialogs/new-or-edit-emergency/new-or-edit-emergency.component';

@Component({
  selector: 'child-emergency-contact-view',
  templateUrl: './emergency-contact-view.component.html',
  styleUrls: ['./emergency-contact-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class ChildViewEmergencycontactViewComponent implements OnInit, OnDestroy {

  // Private
  private _unsubscribeAll: Subject<any>;

  child: Child;
  buttonLoader: boolean;
  setUserModal: NzModalRef;
  dialogRef: any;

  @Input() selected: Child;

  @Output()
  updateScroll: EventEmitter<any>;

  constructor(
    private _logger: NGXLogger,
    private _router: Router,
    private _childrenService: ChildrenService,
    private _modalService: NzModalService,
    private _notification: NotificationService,
    private _matDialog: MatDialog
  ) {

    this.updateScroll = new EventEmitter();


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
    this._logger.debug('child details - emergency contact view !!!');

    // Initial reference
    this.child = this.selected;

    // Subscribe to update current child on changes
    this._childrenService
      .onCurrentChildChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(currentChild => this.child = (!currentChild) ? null : currentChild);

    // sort emergency contacts by call order
    this.child.emergency = this.child.emergency.sort((a, b) => {
        if(b.callOrder && a.callOrder)
            return a.callOrder < b.callOrder? -1 : 1;
    });

  }

  ngOnDestroy(): void {
    this.updateScroll.unsubscribe();
  }

   /*
    * Add new Emergency Contact
    * */
   createEmergencyContact(e: MouseEvent): void
   {
       e.preventDefault();

       this.dialogRef = this._matDialog
           .open(NewOrEditEmergencyComponent,
               {
                   panelClass: 'emergency-new-or-edit-dialog',
                   closeOnNavigation: true,
                   disableClose: true,
                   autoFocus: false,
                   data: {
                       action: AppConst.modalActionTypes.NEW,
                       view: 'child_detail',
                       response: {
                           child :this.child.id
                       }
                   }
               });
       
       this.dialogRef
           .afterClosed()
           .pipe(takeUntil(this._unsubscribeAll))
           .subscribe(
               message =>
               {
                   if (!message) {
                       return;
                   }
                   
                   setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                   this.updateScroll.next();
               },
               error =>
               {
                   throw error;
               }
           );
   }

}
