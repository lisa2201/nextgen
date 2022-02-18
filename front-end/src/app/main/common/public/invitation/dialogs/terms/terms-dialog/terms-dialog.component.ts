import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'terms-dialog',
    templateUrl: './terms-dialog.component.html',
    styleUrls: ['./terms-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TermsDialogComponent implements OnInit {

    /**
     * Constructor
     *
     * @param {MatDialogRef<BranchAddDialogComponent>} matDialogRef
     * @param {RoleService} _roleService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {BranchService} _branchService
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<TermsDialogComponent>,
        private _logger: NGXLogger,
    )
    {
        this._logger.debug('[terms dialog]');
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        
    }

}
