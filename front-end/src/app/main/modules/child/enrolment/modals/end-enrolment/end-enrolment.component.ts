import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ChildEnrolmentService } from '../../services/enrolment.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Enrolment } from '../../models/enrolment.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'child-end-enrolment',
    templateUrl: './end-enrolment.component.html',
    styleUrls: ['./end-enrolment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildEndEnrolmentComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    form: FormGroup;

    @Input() enrolment: Enrolment;
    @Input() value: any;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef,
        private _enrolmentService: ChildEnrolmentService,
        private _notificationService: NotificationService
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
        this._logger.debug('child end enrolment !!!');

        this.form = this.createForm();
        
        // edit mode
        if (this.value)
        {
            this.form.get('end_date').patchValue(this.value, { emitEvent: false });

            this.form.get('end_date').updateValueAndValidity();
        }
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
        return this.form.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            end_date: new FormControl(null, [
                Validators.required,
            ])
        });
    }

    /**
     * check if exist value changed
     *
     * @returns {boolean}
     */
    isValueChanged(): boolean
    {
        return this.value !== this.fc.end_date.value;
    }

    /**
     * end enrolment
     *
     * @returns {Promise<any>}
     */
    updateEnrolment(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            const sendObj = {
                id: this.enrolment.id,
                enrollment_end: DateTimeHelper.getUtcDate(this.fc.end_date.value)
            };

            this._logger.debug('[end enrolment form values]', sendObj);

            this._enrolmentService
                .closeEnrolment(sendObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    response => resolve(response),
                    errorRes => 
                    {
                        setTimeout(() => this._notificationService.displaySnackBar(errorRes.error.message, NotifyType.ERROR), 200);
                        
                        reject(errorRes);
                    }
                );
        });
    }

    /**
     * close modal
     *
     */
    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
