import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { ChildrenService } from '../../../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../../../child.model';

import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import {MatDialog} from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { ChildAddDialogComponent } from '../../../dialogs/new/new.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'child-detail-navigation-sidebar',
    templateUrl: './child-detail-navigation.component.html',
    styleUrls: ['./child-detail-navigation.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildDetailNavigationComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    dialogRef: any;
    ccsExists: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildrenService} _childrenService
     * @param {Router} _router
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {NotificationService} _notification
     */
    constructor(
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _router: Router,
        private _fuseSidebarService: FuseSidebarService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
    )
    {
        // set default values
        

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.ccsExists = true;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child detail view navigation sidebar !!');
        
        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild =>
            {
                this._logger.debug('[child detail - current child]', currentChild);

                this.child = (!currentChild) ? null : currentChild;
            });

        // check if ccs records exists for current organization
        this._childrenService
            .ccsExistsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(ccsExists=>
                {
                    this.ccsExists = ccsExists;
                }
            );
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
     * navigate to url
     *
     * @param {MouseEvent} e
     * @param {string} route
     */
    onNavClick(e: MouseEvent, route?: string): void
    {
        e.preventDefault();

        const elementId: string = (e.target as Element).id || null;

        this._fuseSidebarService.getSidebar('child-detail-navigation-sidebar').close();

        // validation navigation hocks
        if (!_.isNull(elementId))
        {
            if (elementId === 'booking' && !this.child.hasRooms())
            {
                setTimeout(() =>
                {
                    this._notification.displayNotification(
                        'Warning',
                        'This child does not have any rooms attached',
                        NotifyMessageType.WARNING,
                        5000
                    );
                }, 150);

                return;
            }
        }

        if (route)
        {
            setTimeout(() => this._router.navigate([route]), 250);    
        }
    }
    
}
