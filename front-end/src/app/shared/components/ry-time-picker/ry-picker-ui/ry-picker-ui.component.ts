import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as moment from 'moment';

import { slideMotion, NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ryValidationTypes } from '../ry-time-picker.component';
import { TimeRangeValue } from '../interfaces/time-range-object';
import { TimeObject } from '../interfaces/time-object';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'ry-picker-ui',
    templateUrl: './ry-picker-ui.component.html',
    styleUrls: ['./ry-picker-ui.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [
    `
        ::ng-deep .vertical-center-modal {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        ::ng-deep .vertical-center-modal .ant-modal {
            top: 0;
        }
    `
    ],
    animations: [
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class RyPickerUiComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    
    singleValue: number;
    minSingleValue: number;
    maxSingleValue: number;
    mandarinValue: string;

    timeRangeValue: Array<number>;
    minTimeRange: number;
    maxTimeRange: number;
    timeRangeOption: string;
    timeRangeValidateStep: number;

    @Input() action: string;
    @Input() selected: Array<number> | number | null;
    @Input() type: string;
    @Input() minStep: number;

    validationTypes: typeof ryValidationTypes;
    @Input() validationValue: Array<number> | number | null;
    @Input() validationType: ryValidationTypes;

    /**
     * Constructor
     * 
     * @param {NzModalRef} _modal
     */
    constructor(
        private _modal: NzModalRef,
        private cdr: ChangeDetectorRef,
    )
    {
        // set default values
        this.singleValue = this.getCurrentTime;
        this.mandarinValue = this.setMandarinValue();

        this.minSingleValue = 0;
        this.maxSingleValue = 1410;

        this.timeRangeValue = [ AppConst.timePickerDefaultValues.START, AppConst.timePickerDefaultValues.END ];
        this.minTimeRange = 0;
        this.maxTimeRange = 1410; // 23:30
        this.timeRangeOption = '0';
        this.timeRangeValidateStep = 120;

        this.validationTypes = ryValidationTypes;

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
        if (typeof this.selected !== 'undefined' && !_.isNull(this.selected))
        {
            if (this.type === 'range')
            {
                this.timeRangeValue = <Array<number>> this.selected;
                
                // if end time null
                if(_.isNull(_.last(this.timeRangeValue)))
                {
                    this.timeRangeValue[this.timeRangeValue.length - 1] = AppConst.timePickerDefaultValues.END;
                }
            }
            
            if (this.type === 'single')
            {
                this.singleValue = <number> this.selected;

                this.mandarinValue = this.setMandarinValue();
            }
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

    setMandarinValue(): string
    {
        return Math.floor(this.singleValue / 60) < 12 ? '0' : '1';
    }

    get getCurrentTime(): number
    {
        return (moment().toObject().hours * 60) + moment().toObject().minutes;
    }

    getSingleValue(): TimeObject
    {
        return {
            hours: Math.floor(this.singleValue / 60 % 12) || 12,
            minutes: Math.floor(this.singleValue % 60),
            mandarin: this.singleValue / 60 < 12 ? 'AM' : 'PM',
        };
    }

    onSingleValueChanges(value: any): void
    {
        this.mandarinValue = (this.getSingleValue().mandarin === 'AM') ? '0' : '1';
    }

    onMandarinToggle(value: any): void
    {
        if (value === '0')
        {
            this.singleValue = this.singleValue - 12 * 60;
        }
        else
        {
            this.singleValue = this.singleValue + 12 * 60;
        }

        this.cdr.markForCheck();
    }

    getRangeValues(): TimeRangeValue
    {
        return {
            start: {
                hours: Math.floor(_.head(this.timeRangeValue) / 60 % 12) || 12,
                minutes: Math.floor(_.head(this.timeRangeValue) % 60),
                mandarin: _.head(this.timeRangeValue) / 60 < 12 ? 'AM' : 'PM',
            },
            end: {
                hours: Math.floor(_.last(this.timeRangeValue) / 60 % 12) || 12,
                minutes: Math.floor(_.last(this.timeRangeValue) % 60),
                mandarin: _.last(this.timeRangeValue) / 60 < 12 ? 'AM' : 'PM',
            }
        };
    }

    onRangeValueChanges(value: any): void
    {
        if (_.uniq(value).length === 1)
        {
            let start = _.head(this.timeRangeValue);
            let end = _.last(this.timeRangeValue);

            if (_.last(this.timeRangeValue) >= this.maxTimeRange)
            {
                end = start;
                start = start - this.timeRangeValidateStep;
            }
            else
            {
                start = start;
                end = start + this.timeRangeValidateStep;
            }

            this.timeRangeValue = [start, end];
        }
        
    }

    toggleStep(e: MouseEvent, type: string = null): void
    {
        e.preventDefault();

        const isIncrement = !_.isNull(type) && type === 'plus';

        if (this.type === 'range')
        {
            if (this.timeRangeOption === '0')
            {
                if ((isIncrement && (_.head(this.timeRangeValue) >= this.maxTimeRange || _.last(this.timeRangeValue) === _.head(this.timeRangeValue) + this.minStep)) || (!isIncrement && _.head(this.timeRangeValue) === this.minTimeRange))
                {
                    return;
                }

                this.timeRangeValue = [
                    _.head(this.timeRangeValue) + (isIncrement ? +this.minStep : -this.minStep),
                    _.last(this.timeRangeValue)
                ];
            }
            else
            {
                if ((!isIncrement && _.head(this.timeRangeValue) === _.last(this.timeRangeValue) - this.minStep) || (isIncrement && _.last(this.timeRangeValue) === this.maxTimeRange))
                {
                    return;
                }
                
                this.timeRangeValue = [
                    _.head(this.timeRangeValue),
                    _.last(this.timeRangeValue) + (isIncrement ? +this.minStep : -this.minStep)
                ];
            }
        }
        // single 
        else 
        {
            if ((isIncrement && this.singleValue >= this.maxTimeRange) || (!isIncrement && this.singleValue === this.minTimeRange))
            {
                return;    
            }

            this.singleValue = this.singleValue + (isIncrement ? +this.minStep : -this.minStep);
        }

        this.cdr.markForCheck();
    }

    now(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.type === 'single')
        {
            this.singleValue = this.getCurrentTime;    

            this.mandarinValue = this.setMandarinValue();
        }
    }

    validateTime(): boolean
    {
        if (_.isNull(this.validationValue))
        {
            return;    
        }

        if ((this.type === 'single') && this.validationType === ryValidationTypes.GREATER_THAN_VALUE)
        {
            return this.validationValue >= this.singleValue;
        }
        else if ((this.type === 'single') && this.validationType === ryValidationTypes.LESS_THAN_VALUE)
        {
            return this.validationValue <= this.singleValue;
        }
        else if ((this.type === 'range') && this.validationType === ryValidationTypes.OVERLAPPING)
        {
            return (_.head(<Array<number>> this.validationValue) < _.last(this.timeRangeValue) && 
                _.head(this.timeRangeValue) < _.last(<Array<number>> this.validationValue));
        }
        else
        {
            return;
        }
    }

    applyValues(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.validateTime())
        {
            return;
        }
        
        this._modal.close((this.type === 'range') ? this.timeRangeValue : this.singleValue);
    }

    close(e: MouseEvent): void
    { 
        e.preventDefault();

        this._modal.destroy((typeof this.selected !== 'undefined') ? ((this.type === 'range') ? this.timeRangeValue : this.singleValue) : null);
    }
}
