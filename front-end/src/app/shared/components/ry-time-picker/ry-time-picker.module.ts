import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzOverlayModule } from 'ng-zorro-antd';

import { FlexLayoutModule } from '@angular/flex-layout';

import { NzI18nModule } from 'ng-zorro-antd/i18n';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { RyTimePickerComponent } from './ry-time-picker.component';
import { RyPickerUiComponent } from './ry-picker-ui/ry-picker-ui.component';

import { TimeValueAccessorDirective } from './time-format.directive';


@NgModule({
    declarations: [
        RyTimePickerComponent,
        RyPickerUiComponent,
        TimeValueAccessorDirective
    ],
    imports: [
        CommonModule,
        FormsModule,

        FlexLayoutModule.withConfig({ useColumnBasisZero: false }),

        NzI18nModule,
        OverlayModule,
        NzIconModule,
        NzOverlayModule,
        NzSliderModule,
        NzModalModule,
        NzButtonModule,
        NzRadioModule,
        NzSwitchModule,
    ],
    exports: [
        RyTimePickerComponent
    ]
})
export class RyTimePickerModule
{

}
