import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil } from 'rxjs/operators';


@Component({
    selector: 'child-set-crn',
    templateUrl: './set-crn.component.html',
    styleUrls: ['./set-crn.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildSetCRNComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    crnFrom: FormGroup;

    @Input() type: string;
    @Input() value: string;

    hasWhiteSpace: boolean;

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
        

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.hasWhiteSpace = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child/parent set CRN !!!', this.type);

        this.crnFrom = this.createForm();
        
        // edit mode
        if (this.value)
        {
            this.crnFrom.get('crn').patchValue(this.value, { emitEvent: false });

            this.crnFrom.get('crn').updateValueAndValidity();
        }

        this.crnFrom
            .get('crn')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                this.hasWhiteSpace =  value.indexOf(' ') >= 0 ? true : false;
                
            });


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
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.crnFrom.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            crn: new FormControl('', [
                Validators.required,
                // Validators.minLength(this.type === 'child' ? 10 : 20),
                Validators.maxLength(this.type === 'child' ? 10 : 20)
            ])
        });
    }

    isValueChanged(): boolean
    {
        return this.value !== this.fc.crn.value;
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
