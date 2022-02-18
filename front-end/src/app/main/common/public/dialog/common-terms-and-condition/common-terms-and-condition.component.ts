import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { TermsDialogComponent } from '../../invitation/dialogs/terms/terms-dialog/terms-dialog.component';

@Component({
  selector: 'common-terms-and-condition',
  templateUrl: './common-terms-and-condition.component.html',
  styleUrls: ['./common-terms-and-condition.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class CommonTermsAndConditionComponent implements OnInit {

 
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
