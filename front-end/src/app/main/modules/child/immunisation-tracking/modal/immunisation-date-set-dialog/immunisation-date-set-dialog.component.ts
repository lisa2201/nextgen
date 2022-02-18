import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ImmunisationSchedule } from 'app/main/modules/immunisation/model/immunisation-schedule.model';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import * as _ from 'lodash';
import { NzModalRef } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Child } from '../../../child.model';
import { scheduleDataMap } from '../../immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';

@Component({
    selector: 'immunisation-date-set-dialog',
    templateUrl: './immunisation-date-set-dialog.component.html',
    styleUrls: ['./immunisation-date-set-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationDateSetDialogComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dateSetForm: FormGroup;
    buttonLoader: boolean;
    knowDate: boolean;

    @Input() immunisation: Immunisation;
    @Input() schedule: scheduleDataMap;
    @Input() child: Child;
    @Input() isEdit: boolean;

    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    ) {

    
        this.buttonLoader = false;
        this._unsubscribeAll = new Subject();
    }

    ngOnInit() {
        (this.isEdit && this.schedule.tracker.date )? this.knowDate = true : (this.isEdit && !this.schedule.tracker.date ) ?  this.knowDate = false : this.knowDate = false;
        this.dateSetForm = this.createForm();

        this.dateSetForm
            .get('knowDate')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[knowData value change]', value);


                if (!_.isNull(value)) {
                    	if(value === '0'){
                            this.knowDate = true;
                            this.fc.date.setValidators([Validators.required]);
                
                        }
                        else{
                            this.knowDate = false;
                            this.fc.date.clearValidators();
                            this.fc.date.reset();
                        }

                        this.fc.date.updateValueAndValidity();
                }


            });
    }

    createForm(): FormGroup {

        return new FormGroup({
            knowDate:  new FormControl((this.isEdit && this.schedule.tracker.date )? '0' : (this.isEdit && !this.schedule.tracker.date ) ?  '1' : '', [Validators.required]),
            date: new FormControl(this.isEdit? this.schedule.tracker.date :  '', []),
        });
    }

    get fc(): any {
        return this.dateSetForm.controls;
    }


    getSelectedDate() {

        return (this.dateSetForm.valid) ? this.fc.date.value : null;
    }

    destroyModal(): void {
        this._modal.destroy();
    }

    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
