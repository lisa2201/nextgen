import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';

import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';
import { SessionRoutine, SessionRoutineItem } from '../../enrolment.component';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'child-set-enrolment-session',
    templateUrl: './set-enrolment-session.component.html',
    styleUrls: ['./set-enrolment-session.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildSetEnrolmentSessionComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    sessionFrom: FormGroup;
    filteredFees: Fee[];
    client: AuthClient;
    editMode: boolean;

    @Input() action: string;
    @Input() fees: Fee[];
    @Input() value: SessionRoutineItem;
    @Input() selected: SessionRoutine;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalRef} _modal
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef,
        private _authService: AuthService
    )
    {
        // set default values
        this.client = this._authService.getClient();

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
        this._logger.debug('child enrolment set session !!!', this.selected);

        this.editMode = !_.isNull(this.value) && AppConst.modalActionTypes.EDIT === this.action;

        this.filteredFees = !this.editMode
            ? this.fees.filter((i: Fee) => _.findIndex(this.selected.sessions, (slot: any) => i.id === slot.fee) === -1)
            : this.fees.filter((i: Fee) => _.findIndex(this.selected.sessions, (slot: any) => i.id === slot.fee && i.id !== this.value.fee) === -1);

        this.sessionFrom = this.createForm();

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.sessionFrom
            .get('session')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.checkSessionTimeValidation());
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
        return this.sessionFrom.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            session: new FormControl(this.editMode ? this.value.fee : null, [
                Validators.required,
                this.timeOverlapValidator.bind(this)
            ]),
            session_time: new FormControl(this.editMode ? [
                this.value.session.start,
                this.value.session.end
            ] : null)
        });
    }

    /**
     * check if form value changed
     *
     * @returns {boolean}
     */
    isValueChanged(): boolean
    {
        return (this.editMode) ? !this.fees.find(i => i.id === this.fc.session.value).hasSession() 
            ? !isEqual(Object.values(this.value.session), this.fc.session_time.value) 
            : this.value.fee !== this.fc.session.value : _.isNull(this.value) || this.value.fee !== this.fc.session.value;
    }

    /**
     * check if session overlapped with existing
     *
     * @param {AbstractControl} formControl
     * @returns {*}
     */
    timeOverlapValidator(formControl: AbstractControl): { [key: string]: boolean } | null
    {
        if (!formControl.parent)
        {
            return null;
        }

        if (!_.isNull(formControl.value) && this.validateFeeSessionOverlap())
        {
            return { 'overlapped': true };
        }

        return null;
    }

    /**
     * set time picker required validation
     *
     * @param {AbstractControl} formControl
     * @returns {*}
     */
    timeRequiredValidator(formControl: AbstractControl): { [key: string]: boolean } | null
    {
        if (!formControl.parent)
        {
            return null;
        }

        if (formControl.value === '' || _.isNull(formControl.value) || (_.isObject(formControl.value) && _.isNull(formControl.value['value'])))
        {
            return { 'required': true };
        }

        return null;
    }

    /**
     * check fee has session start and end time
     *
     * @returns {boolean}
     */
    checkFeeHasSessionTime(): boolean
    {
        return !_.isNull(this.fc.session.value) && !this.fees.find(i => i.id === this.fc.session.value).hasSession();
    }

    /**
     * assign validation if fee doesn't have session time
     */
    checkSessionTimeValidation(): void
    {
        // clear validators
        this.sessionFrom.get('session_time').clearValidators();

        this.sessionFrom.get('session_time').patchValue(null, { emitEvent: false });
        this.sessionFrom.get('session_time').updateValueAndValidity();
        this.sessionFrom.get('session_time').reset();

        if (this.checkFeeHasSessionTime())
        {    
            this.sessionFrom.get('session_time').setValidators([this.timeRequiredValidator, this.timeOverlapValidator.bind(this)]);

            this.sessionFrom.get('session_time').updateValueAndValidity();
        }
    }

    /**
     * check if session is overlapping
     *
     * @returns {boolean}
     */
    validateFeeSessionOverlap(): boolean
    {
        let overlap = false;

        const selected: Fee = this.fees.find(i => i.id === this.fc.session.value);

        if (!selected || (this.editMode && (this.value.fee === selected.id || this.selected.sessions.length === 1))
            || (!selected.hasSession() && (_.isNull(this.fc.session_time.value))))
        {
            return overlap;    
        }

        const sessionStart = selected.hasSession() ? selected.sessionStart : _.head(this.fc.session_time.value);
        const sessionEnd = selected.hasSession() ? selected.sessionEnd : _.last(this.fc.session_time.value);

        // if edit - remove selected item from session list
        const filteredList = this.editMode
            ? this.selected.sessions.filter((i: SessionRoutineItem) => i.fee !== this.value.fee)
            : this.selected.sessions; 

        for (const el of filteredList)
        {
            if (sessionStart < el.session.end && el.session.start < sessionEnd)
            {
                overlap = true;

                break;
            }
        }

        return overlap;
    }

    getSelectedSession(): { fee: Fee, session: any } | null
    {
        return {
            fee: this.fees.find(i => i.id === this.fc.session.value),
            session: this.fc.session_time.value
        };
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
