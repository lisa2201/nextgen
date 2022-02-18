import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';

import { fuseAnimations } from '@fuse/animations';

import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { NotificationService } from 'app/shared/service/notification.service';
import { AuthService } from 'app/shared/service/auth.service';
import { AuthUser } from 'app/shared/model/authUser';
import { DOCUMENT } from '@angular/common';
import { HomeService } from './services/home.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations : fuseAnimations
})
export class HomeComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    user: AuthUser;
    children: any[];
    show_child_select: boolean;
    selectedChild: any;    
                
    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _authService: AuthService,
        private _homeService: HomeService,
        @Inject(DOCUMENT) private _document: any,
    )
    {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.show_child_select = false;  
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('dashboard !!!');

        setTimeout(() => {
            this._notification.displaySnackBar('Hi, welcome to dashboard...', NotifyType.SUCCESS);
        }, 1000);

        this._document.body.classList.add('page-content-reset');

        // Subscribe to the user changes
        this._authService.currentUser
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((user: any) => {
            this._logger.debug('[parent dashboard]', user);
            if(user)
            {
                this.user = user;                 
            }
        });

        // get parent child list
        this._homeService.getChildren()
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {
            this._logger.debug('[child list dashboard]', response);

            function status(element, index, array) { 
                return (element.status == '1'); 
             } 
                       
            response = response.filter(status); 
            this.children = response; 
            if(this.children.length > 1){
                this.show_child_select = true;
            }
        });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {

        this._document.body.classList.remove('page-content-reset');
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
      
}
