import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ElementRef, Renderer2, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';

/**
 * avaliable options : range | single
 */
@Component({
    selector: 'time-picker',
    templateUrl: './time-picker.component.html',
    styleUrls: ['./time-picker.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class TimePickerComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    title: string;

    action: string;
    selected: any;
    type: string;
    minStep: number;

    singleValue: number;
    minSingleValue: number;
    maxSingleValue: number;
    mandarinValue: string;
    
    timeRangeValue: number[];
    minTimeRange: number;
    maxTimeRange: number;
    timeRangeOption: string;
    timeRangeValidateStep: number;

    editMode: boolean;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<TimePickerComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {ElementRef} _element
     * @param {Renderer2} _renderer
     * @param {ChangeDetectorRef} cdr
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<TimePickerComponent>,
        private _logger: NGXLogger,
        private _element: ElementRef,
        private _renderer: Renderer2,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.minStep = this._data.step;
        this.type = this._data.type;
        this.action = this._data.action;
        this.selected = this._data.selected;
        this.editMode = _.isObject(this._data) && !_.isEmpty(this._data) && AppConst.modalActionTypes.EDIT === this.action;

        this.singleValue = 0;
        this.mandarinValue = '0';

        this.minSingleValue = 0;
        this.maxSingleValue = 1410;

        this.timeRangeValue = [540, 1080];
        this.minTimeRange = 0;
        this.maxTimeRange = 1410; // 23:30
        this.timeRangeOption = '0';
        this.timeRangeValidateStep = 120;

        if (this.editMode)
        {
            if (this.type === 'range')
            {
                this.timeRangeValue = Object.values(this._data.response);
            }
            
            if (this.type === 'single')
            {
                this.singleValue = this._data.response;
                this.mandarinValue = Math.floor(this._data.response / 60) < 12 ? '0' : '1';
            }
        }

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
        this._logger.debug('time picker', this._data);

        this.setLayoutStyle();
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

    setLayoutStyle(): void
    {
        let cssClass = '';

        switch (this.type)
        {
            case 'single':
                cssClass = 'single-pk';
                this.title = `${!this.editMode ? 'Select' : 'Edit'} Time`;
                break;
            
            case 'range':
                cssClass = 'range-pk';
                this.title = `${!this.editMode ? 'Select' : 'Edit'} Time Range`;
                break;
        
            default:
                cssClass = 'single-pk';
                this.title = 'Select Time';
                break;
        }

        this._renderer.addClass(this._element.nativeElement, cssClass);
    }

    getSingleValue(): any
    {
        return {
            h: Math.floor(this.singleValue / 60 % 12) || 12,
            m: Math.floor(this.singleValue % 60),
            a: this.singleValue / 60 < 12 ? 'AM' : 'PM',
        };
    }

    onSingleValueChanges(value: any): void
    {
        this.mandarinValue = (this.getSingleValue().a === 'AM') ? '0' : '1';
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

    getRangeValues(): any
    {
        return {
            start: {
                h: Math.floor(_.head(this.timeRangeValue) / 60 % 12) || 12,
                m: Math.floor(_.head(this.timeRangeValue) % 60),
                a: _.head(this.timeRangeValue) / 60 < 12 ? 'AM' : 'PM',
            },
            end: {
                h: Math.floor(_.last(this.timeRangeValue) / 60 % 12) || 12,
                m: Math.floor(_.last(this.timeRangeValue) % 60),
                a: _.last(this.timeRangeValue) / 60 < 12 ? 'AM' : 'PM',
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

            this.timeRangeValue = [
                start,
                end
            ];
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

    validateTime(): boolean
    {
        let overlap = false;

        if (this.type === 'range' && !(this.editMode && this.selected.length === 1))
        {
            for (const el of this.selected) 
            {
                if (_.head(this.timeRangeValue) < el.end && el.start < _.last(this.timeRangeValue))
                {
                    overlap = true;

                    break;
                }
            }
        }

        return overlap;
    }

    applyValues(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.validateTime())
        {
            return;
        }

        this.matDialogRef.close((this.type === 'range') ? this.timeRangeValue : this.singleValue);
    }
}
