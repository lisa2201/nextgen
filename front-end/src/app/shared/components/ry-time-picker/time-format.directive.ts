import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import * as moment from 'moment';
import * as _ from 'lodash';

import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NGXLogger } from 'ngx-logger';

@Directive({
    selector: 'input[ryFormatTime]',
    exportAs: 'ryFormatTime',
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: TimeValueAccessorDirective,  multi: true }]
})
export class TimeValueAccessorDirective implements ControlValueAccessor {

    private _onChange?: (value: Array<number> | number | null) => void;
    private _onTouch?: () => void;

    private _separate: string = ' - ';

    @Input() ryFormatTime?: string;

    @HostListener('keyup')
    keyup(): void 
    {
        this.changed();
    }

    @HostListener('blur')
    blur(): void
    {
        this.touched();
    }

    /**
     * Constructor
     * 
     * @param {ElementRef} elementRef
     * @param {NGXLogger} _logger
     */
    constructor(
        private elementRef: ElementRef,
        private _logger: NGXLogger,
    )
    {

    }

    changed(): void
    {
        if (this._onChange)
        {
            this._logger.debug('[ryFormatTime] change', this.elementRef.nativeElement.value);
            // const values = this.elementRef.nativeElement.value.split(this._separate);
            // const value = moment(values[0]).toDate();
            // this._onChange(value!);
            return;
        }
    }

    touched(): void
    {
        if (this._onTouch)
        {
            this._onTouch();
        }
    }

    writeValue(value: Array<number> | number | null): void
    {
        let formattedValue: string = '';

        if(!_.isNull(value))
        {
            if (_.isArray(value))
            {
                formattedValue = DateTimeHelper.convertMinsToMoment(_.head(value)).format(this.ryFormatTime) + this._separate + DateTimeHelper.convertMinsToMoment(_.last(value)).format(this.ryFormatTime);
            }
            else
            {
                formattedValue = DateTimeHelper.convertMinsToMoment(value).format(this.ryFormatTime);
            }
        }

        this.elementRef.nativeElement.value = formattedValue;
    }

    registerOnChange(fn: (value: Array<number> | number | null) => void): void
    {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => void): void
    {
        this._onTouch = fn;
    }
}
