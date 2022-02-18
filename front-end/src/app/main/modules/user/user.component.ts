import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { AttributesMap } from 'ng-dynamic-component';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import {
    fadeInOnEnterAnimation,
    fadeOutOnLeaveAnimation
} from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';
import { UsersService } from './services/users.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AppConst } from 'app/shared/AppConst';

import { UserBaseViewAdministrationComponent } from './user-base-view/user-base-view-administration/user-base-view-administration.component';
import { UserBaseViewRootComponent } from './user-base-view/user-base-view-root/user-base-view-root.component';
import { UserBaseViewOwnerComponent } from './user-base-view/user-base-view-owner/user-base-view-owner.component';
import { ParentViewComponent } from './parent-view/parent-view.component';

@Component({
    selector: 'app-manage-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class UserComponent implements OnInit, OnDestroy {
    
    // Private
    private _unsubscribeAll: Subject<any>;

    component: any;
    viewParent: boolean;

    componentAttrs: AttributesMap = {
        id: '',
        class: ''
    };

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {MatDialog} _matDialog
     * @param {CommonService} _commonService
     * @param {UsersService} _usersService
     */
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _usersService: UsersService,
        private _router: Router
    )
    {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('users !!!');

        this.viewParent = this._router.url !== '' && this._router.url.indexOf('/manage-parents') > -1 ? true : false;

        console.log('[router find]', this.viewParent);

        this.component = this.setComponent;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._usersService.unsubscribeOptions(
            this._router.routerState.snapshot.url.indexOf('/user') > -1
        );

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    get setComponent(): any
    {
        let _component = null;

        switch (this._authService.getUserLevel())
        {
            case AppConst.roleLevel.ROOT:
                _component = UserBaseViewRootComponent;

                this.componentAttrs = {
                    id: 'user-base-view-root',
                    class: 'page-layout simple left-sidebar inner-sidebar inner-scroll'
                };
                
                break;
            case AppConst.roleLevel.OWNER:
                _component = UserBaseViewOwnerComponent;

                this.componentAttrs = {
                    id: 'user-base-view-owner',
                    class: 'page-layout simple left-sidebar inner-sidebar inner-scroll'
                };
                
                break;
            case AppConst.roleLevel.ADMINISTRATION:
                if (!this.viewParent)
                {
                    _component = UserBaseViewAdministrationComponent;

                    this.componentAttrs = {
                        id: 'user-base-view-administration',
                        class: 'page-layout simple left-sidebar inner-sidebar inner-scroll'
                    };
                }
                else
                {
                    _component = ParentViewComponent;

                    this.componentAttrs = {
                        id: 'user-base-parent-view',
                        class: 'page-layout carded fullwidth inner-scroll'
                    };
                }

                break;
            default:
                break;
        }

        return _component;
    }
}
