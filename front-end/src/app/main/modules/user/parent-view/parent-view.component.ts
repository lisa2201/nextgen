import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { ChildrenService } from '../../child/services/children.service';
import { AuthService } from 'app/shared/service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { UsersService } from '../services/users.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Child } from '../../child/child.model';
import { Subject } from 'rxjs';
import { User } from '../user.model';

import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { ParentAddDialogComponent } from '../parent-view/dialogs/new/new.component';
import { ParentBulkInvitationComponent } from './dialogs/parent-bulk-invitation/parent-bulk-invitation.component';
import { CommonService } from 'app/shared/service/common.service';

@Component({
    selector: 'user-base-parent-view',
    templateUrl: './parent-view.component.html',
    styleUrls: ['./parent-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentViewComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any>;
    currentUser: User;
    buttonLoader: boolean;
    dialogRef: any;
    userList: User[];

    /**
     * Constructor
     * 
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {MatDialog} _matDialog
     * @param {Router} _router
     */
    constructor(
        private _logger: NGXLogger,
        private _usersService: UsersService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _fuseSidebarService: FuseSidebarService,
        private _router: Router,
        private _commonService: CommonService,
    ) {
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
    }

    ngOnInit(): void {
        this._logger.debug('child !!!');

        // Subscribe to update current child on changes
        this._usersService.onCurrentUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentUser => {
                this._logger.debug('[user view - current child]', currentUser);

                this.currentUser = !currentUser ? null : currentUser;
            });

            this._usersService.onUsersChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {
            this._logger.debug('[users]', response);

            this.userList = response.items;
        });
    }

    ngOnDestroy(): void {
        // reset service
        this._usersService.unsubscribeOptions(
            this._router.routerState.snapshot.url.indexOf('/manage-parent') > -1
        );

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    /**
     * Add new parent item
     */
    addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        setTimeout(() => this._fuseSidebarService.getSidebar('parent-list-filter-sidebar').close(), 250);
        
        this.buttonLoader = true;
        Promise.all([
            this._commonService.getSates(),
        ])
        .then(([states]: [any]) =>
        {

        setTimeout(() => this.buttonLoader = false, 200);

        this.dialogRef = this._matDialog
            .open(ParentAddDialogComponent,
            {
                panelClass: 'parent-new-dialog',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalActionTypes.NEW,
                    response: {},
                    timezones: [],
                    countries: states,
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
        });
    }

    addDialogBulkInvitation(e: MouseEvent): void
    {
        e.preventDefault();

        setTimeout(() => this._fuseSidebarService.getSidebar('parent-list-filter-sidebar').close(), 250);
        
        this.buttonLoader = true;

        Promise.all([
            this._usersService.getUsersAll()
        ])
        .then(([users]: [User[]]) => 
        {
            setTimeout(() => this.buttonLoader = false, 200);

            this.dialogRef = this._matDialog
            .open(ParentBulkInvitationComponent,
            {
                panelClass: 'parent-bulk-invitation',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalActionTypes.NEW,
                    user: users
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
        });

        
    }
}
