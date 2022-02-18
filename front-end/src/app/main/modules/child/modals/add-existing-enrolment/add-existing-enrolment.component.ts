import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations'
;
import { NzModalRef } from 'ng-zorro-antd/modal';

import { NotificationService } from 'app/shared/service/notification.service';
import { ChildEnrolmentService } from '../../enrolment/services/enrolment.service';

import { Child } from '../../child.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'add-existing-enrolment',
    templateUrl: './add-existing-enrolment.component.html',
    styleUrls: ['./add-existing-enrolment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddExistingEnrolmentComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    enrolmentForm: FormGroup;

    @Input() child: Child;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalRef} _modal
     * @param {ChildEnrolmentService} _enrolmentService
     * @param {NotificationService} _notificationService
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef,
        private _enrolmentService: ChildEnrolmentService,
        private _notificationService: NotificationService,
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
        this._logger.debug('add existing enrolment !!!');

        this.enrolmentForm = this.createForm();
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
        return this.enrolmentForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            enrolment: new FormControl('', [
                Validators.required,
                Validators.maxLength(20)
            ])
        });
    }

    /**
     * import enrolment
     *
     * @returns {Promise<any>}
     */
    verifyEnrolment(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._enrolmentService
                .verifyEnrolment({
                    enrolment: this.fc.enrolment.value,
                    child: this.child.id 
                })
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

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
