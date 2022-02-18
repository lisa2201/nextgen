import { Component, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectionStrategy, TemplateRef, Input, ViewChild, ElementRef, Output, EventEmitter, Renderer2, ChangeDetectorRef, AfterViewInit, SimpleChanges, OnChanges, forwardRef } from '@angular/core';
import { CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';
import { InputBoolean, slideMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { DateTimeHelper } from 'app/utils/date-time.helper';

import { RyPickerUiComponent } from './ry-picker-ui/ry-picker-ui.component';

export type RyTimePickerType = 'single' | 'range';

export enum ryValidationTypes {
    LESS_THAN_VALUE = 'less-than-value',
    GREATER_THAN_VALUE = 'greater-than-value',
    OVERLAPPING = 'over-lapping'
}

@Component({
    selector: 'ry-time-picker',
    exportAs: 'ryTimePicker',
    templateUrl: './ry-time-picker.component.html',
    styleUrls: ['./ry-time-picker.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.ant-picker]': `true`,
        '[class.ant-picker-large]': `rySize === 'large'`,
        '[class.ant-picker-small]': `rySize === 'small'`,
        '[class.ant-picker-disabled]': `ryDisabled`,
        '[class.ant-picker-full-width]': `ryFullWidth`,
        '[class.ant-picker-focused]': `focused`,
        '(click)': 'open()'
    },
    animations: [
        fuseAnimations,
        slideMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ],
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RyTimePickerComponent), multi: true }],
})
export class RyTimePickerComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnChanges, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    private _onChange?: (value: Array<number> | number | null) => void;
    private _onTouched?: () => void;
    
    modelValue: Array<number> | number | null = null;
    isInit = false;
    focused = false;
    origin: CdkOverlayOrigin;
    modal: NzModalRef;

    @ViewChild('inputElement', { static: true }) inputRef: ElementRef<HTMLInputElement>;
    
    @Input() ryType: RyTimePickerType = 'single';
    @Input() rySize: string | null = 'large';
    @Input() ryPlaceHolder: string = '';
    @Input() ryAddOn: TemplateRef<void>;
    @Input() ryMinuteStep: number;
    @Input() ryOpen: boolean = false;
    @Input() ryFormat: string = 'h:mm:ss A';

    @Input() ryDefaultOpenValue?: Array<number> | number | null;
    @Input() ryValidateValue: Array<number> | number | null;
    @Input() ryValidateType: ryValidationTypes;

    @Input() @InputBoolean() ryDisabled = false;
    @Input() @InputBoolean() ryFullWidth = true;
    @Input() @InputBoolean() ryAutoFocus = false;
    @Input() @InputBoolean() ryShowClear = true;

    @Output() readonly ryOpenChange = new EventEmitter<boolean>();
    
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalService} _modalService
     * @param {Renderer2} _renderer
     * @param {ChangeDetectorRef} _cdr
     */
    constructor(
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _renderer: Renderer2,
        private _cdr: ChangeDetectorRef
    )
    {
        // Set default values

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void
    {
        this._logger.debug('time picker 👨‍💻', this.modelValue);

        // set defaults
        // this.ryFormat = this.ryFormat ? this.ryFormat : ;
    }

    ngOnChanges(changes: SimpleChanges): void
    {
        const { ryDisabled, ryAutoFocus, ryTime } = changes;

        if (ryDisabled)
        {
            const value = ryDisabled.currentValue;
            const input = this.inputRef.nativeElement as HTMLInputElement;
            
            if (value)
            {
                this._renderer.setAttribute(input, 'disabled', '');
            }
            else
            {
                this._renderer.removeAttribute(input, 'disabled');
            }
        }

        if (ryAutoFocus)
        {
            this.updateAutoFocus();
        }
    }

    ngAfterViewInit(): void
    {
        this.isInit = true;

        this.updateAutoFocus();
    }

    ngOnDestroy(): void
    {
        if (this.modal)
        {
            this.modal.close();    
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    open(): void
    {
        if (this.ryDisabled || this.ryOpen)
        {
            return;
        }

        this.focus();

        this.ryOpen = true;
        
        // set default value
        this.modelValue = this.modelValue ? this.modelValue : this.ryDefaultOpenValue; 

        this._cdr.markForCheck();

        setTimeout(() =>
        {
            this.modal = this._modalService
                .create({
                    nzContent: RyPickerUiComponent,
                    nzMaskClosable: false,
                    nzMask: true,
                    nzWrapClassName: 'vertical-center-modal',
                    nzClassName: 'ry-picker-ui',
                    nzAutofocus: null,
                    nzComponentParams: {
                        selected: this.modelValue,
                        type: this.ryType,
                        minStep: this.ryMinuteStep ? this.ryMinuteStep : 1,
                        validationValue: this.ryValidateValue,
                        validationType: this.ryValidateType
                    }
                });

            this.modal
                .afterClose
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(response =>
                {
                    this.setValue(response);

                    this.close();
                });

            this.ryOpenChange.emit(this.ryOpen);
        }, 0);
    }

    close(): void
    {
        this.ryOpen = false;

        this._cdr.markForCheck();

        this.ryOpenChange.emit(this.ryOpen);
    }

    setValue(v: Array<number> | number | null): void
    {
        this.modelValue = v;

        if (this._onChange)
        {
            this._onChange(this.modelValue);
        }

        if (this._onTouched)
        {
            this._onTouched();
        }
    }

    updateAutoFocus(): void
    {
        if (this.isInit && !this.ryDisabled)
        {
            if (this.ryAutoFocus)
            {
                this._renderer.setAttribute(this.inputRef.nativeElement, 'autofocus', 'autofocus');
            }
            else
            {
                this._renderer.removeAttribute(this.inputRef.nativeElement, 'autofocus');
            }
        }
    }

    onClickClearBtn(event: MouseEvent): void
    {
        event.stopPropagation();

        this.setValue(null);
    }

    onFocus(value: boolean): void 
    {
        this.focused = value;
    }

    formatValue(value: any): string
    {
        if (_.isArray(value))
        {
            return DateTimeHelper.convertMinsToMoment(_.head(value)).format(this.ryFormat) + ' to ' + DateTimeHelper.convertMinsToMoment(_.last(value)).format(this.ryFormat);
        }
        else
        {
            return DateTimeHelper.convertMinsToMoment(value).format(this.ryFormat);
        }
    }

    focus(): void
    {
        if (this.inputRef.nativeElement)
        {
            this.inputRef.nativeElement.focus();
        }
    }

    blur(): void
    {
        if (this.inputRef.nativeElement)
        {
            this.inputRef.nativeElement.blur();
        }
    }

    // ------------------------------------------------------------------------
    // Control value accessor implements
    // ------------------------------------------------------------------------

    writeValue(v: Array<number> | number | null): void
    {
        this.modelValue = v;

        this._cdr.markForCheck();
    }

    registerOnChange(fn: (value: Array<number> | number | null) => void): void
    {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => void): void
    {
        this._onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void
    {
        this.ryDisabled = isDisabled;

        this._cdr.markForCheck();
    }
}

