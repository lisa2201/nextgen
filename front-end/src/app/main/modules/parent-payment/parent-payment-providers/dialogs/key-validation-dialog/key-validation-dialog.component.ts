import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { helpMotion } from 'ng-zorro-antd';
import { ParentPaymentProvider } from '../../parent-payment-provider.model';

@Component({
    selector: 'app-key-validation-dialog',
    templateUrl: './key-validation-dialog.component.html',
    styleUrls: ['./key-validation-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class KeyValidationDialogComponent implements OnInit {

    providers: ParentPaymentProvider[];

    constructor(
        public matDialogRef: MatDialogRef<KeyValidationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) { 
        this.providers = this._data.providers ? this._data.providers : [];
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------


}
