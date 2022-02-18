import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'set-absence-reason',
    templateUrl: './set-absence-reason.component.html',
    styleUrls: ['./set-absence-reason.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SetAbsenceReasonComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    setAbsenceReasonForm: FormGroup;

    @Input() reasons: any[];
    @Input() selected: any;
    
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
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('set absence reason - modal !!!', this.selected);

        this.setAbsenceReasonForm = this.createForm();

        // this.onChanges();
    }

    onChanges(): void
    {
        // Subscribe to form input changes
        this.setAbsenceReasonForm
            .get('absence')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.setAbsenceReasonForm.get('absent_document_held').patchValue(false, { eventEmit: false });
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

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.setAbsenceReasonForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            absence: new FormControl(this.selected.ab_code, [Validators.required]),
            absent_document_held: new FormControl(this.selected.abs_doc_held)
        });
    }

    /**
     * get absence code
     *
     * @returns {{ abs_code: string, abs_doc_held: boolean }}
     */
    getValue(): { abs_code: string, abs_doc_held: boolean }
    {
        return {
            abs_code: this.fc.absence.value,
            abs_doc_held: this.fc.absent_document_held.value
        };
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
