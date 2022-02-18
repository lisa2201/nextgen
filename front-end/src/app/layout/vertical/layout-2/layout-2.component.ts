import { Component, OnDestroy, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FuseConfigService } from '@fuse/services/config.service';
import { CommonService } from 'app/shared/service/common.service';

import { navigation } from 'app/navigation/navigation';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector     : 'vertical-layout-2',
    templateUrl  : './layout-2.component.html',
    styleUrls    : ['./layout-2.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class VerticalLayout2Component implements OnInit, OnDestroy
{
    fuseConfig: any;
    navigation: any;

    // Private
    private _unsubscribeAll: Subject<any>;

    @ViewChild(FusePerfectScrollbarDirective)
    scrollDirective: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {FuseConfigService} _fuseConfigService
     * @param {CommonService} _commonService
     */
    constructor(
        private _fuseConfigService: FuseConfigService,
        private _commonService: CommonService,
    )
    {
        // Set the defaults
        this.navigation = navigation;

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
        // Subscribe to config changes
        this._fuseConfigService
            .config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config) => {
                this.fuseConfig = config;
            });
        
        // Subscribe to parent scroll changes
        this._commonService
            ._updateParentScroll
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => setTimeout(() => this.updateParentScroll(), 50));
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
     * update main scroll bar
     *
     */
    updateParentScroll(): void
    {        
        if (this.scrollDirective)
        {
            this.scrollDirective.update(true);    
        }
    }
}
