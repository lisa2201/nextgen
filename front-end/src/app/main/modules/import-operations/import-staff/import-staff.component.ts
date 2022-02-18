import { Component, OnInit, ViewEncapsulation, ViewChild, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Organization } from '../../organization/Models/organization.model';
import { Branch } from '../../branch/branch.model';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { User } from '../../user/user.model';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { CommonService } from 'app/shared/service/common.service';
import { MatDialog } from '@angular/material/dialog';
import { ImportStaffDialogComponent } from './modal/import-staff-dialog/import-staff-dialog.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { finalize } from 'rxjs/operators';
import { RoleService } from '../../role/services/role.service';
import * as _ from 'lodash';
import { Role } from '../../role/role.model';
import { ImportStaffService } from './service/staff-import.service';

@Component({
  selector: 'import-staff',
  templateUrl: './import-staff.component.html',
  styleUrls: ['./import-staff.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportStaffComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    organizations: Organization[];
    roles: Role[];
    organization: Organization;
    branch: Branch;
    buttonLoader: boolean;
    importModal: NzModalRef;
    importedData: any;
    users: User[];
    dialogRef: any;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    @Output()
    updateScroll: EventEmitter<boolean>;

    constructor(
        public _matDialog: MatDialog,
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _staffImportService: ImportStaffService,
        private _notificationService: NotificationService,
    )
    {
        // set default values
        this.organizations = [];
        this.organization = null;
        this.importedData = [];
        this.users= [];
        this.buttonLoader = false;
        this.updateScroll = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }
  ngOnInit() {

    this._staffImportService
            .onDependsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => this.organizations = data.subscribers);

            this._staffImportService
            .onRoleChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: Role[]) => this.roles = data);

            this._staffImportService
            .onUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => this.users = data.user);
      
  }

      /**
     * update view scroll on tab collapsed
     *
     * @param {boolean} value
     */
    onTabCollapsed(value: boolean): void
    {
        this.updateScroll.next(true);
    }


    addDialog(e: MouseEvent): void
    {
        e.preventDefault();
        
        this.buttonLoader = true;

            setTimeout(() => this.buttonLoader = false, 200);

            this.dialogRef = this._matDialog
                .open(ImportStaffDialogComponent,
                {
                    panelClass: 'branch-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        org: this.organizations,
                        roles: this.roles
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
    
                    this._notificationService.clearSnackBar();
    
                    setTimeout(() => this._notificationService.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });
    }



}
