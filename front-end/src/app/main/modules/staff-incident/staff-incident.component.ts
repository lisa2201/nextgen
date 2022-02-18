import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { takeUntil, finalize, shareReplay, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { Subject, combineLatest } from 'rxjs';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { NotificationService } from 'app/shared/service/notification.service';
import { StaffIncidentService } from './services/staff-incident.service';
import { NewOrEditComponent } from './dialogs/new-or-edit/new-or-edit.component';
import * as _ from 'lodash';

@Component({
  selector: 'app-staff-incident',
  templateUrl: './staff-incident.component.html',
  styleUrls: ['./staff-incident.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 300 }),
      fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class StaffIncidentComponent implements  OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    dialogRef: any;
    buttonLoader: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {StaffIncidentService} _staffIncidentService
     * @param {MatDialog} _matDialog
    //  * @param {Router} _router
     */
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _staffIncidentService: StaffIncidentService,
        private _notification: NotificationService,
    ) { 
        this.buttonLoader = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    /**
     * Add new incident
     */
    addForm(e: MouseEvent): void{
        e.preventDefault();
        this.buttonLoader = true;

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
                            action: AppConst.modalActionTypes.NEW,
                            staff: stafflist
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

}
