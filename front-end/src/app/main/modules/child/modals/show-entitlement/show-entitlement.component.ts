import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd';

import { EnrolmentEntitlement } from '../../enrolment/models/entitlement.model';

@Component({
    selector: 'show-child-entitlement',
    templateUrl: './show-entitlement.component.html',
    styleUrls: ['./show-entitlement.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ShowEntitlementComponent implements OnInit, OnDestroy {


    @Input() entitlement: EnrolmentEntitlement;
    
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalRef} _modal
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    )
    {
        // set default values
        
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child set room modal !!!');
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
