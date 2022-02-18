import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentPaymentSummaryWidgetComponent } from './parent-payment-summary-widget/parent-payment-summary-widget.component';
import { FuseSharedModule } from '@fuse/shared.module';
import { FuseWidgetModule } from '@fuse/components';
import { KM8SharedModule } from 'app/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { NzFormModule, NzRadioModule, NzSelectModule, NzButtonModule, NzIconModule, NzInputModule, NzDropDownModule, NzDatePickerModule, NzSpinModule } from 'ng-zorro-antd';
import { ParentPaymentOverdueWidgetComponent } from './parent-payment-overdue-widget/parent-payment-overdue-widget.component';


@NgModule({
    declarations: [
        ParentPaymentSummaryWidgetComponent,
        ParentPaymentOverdueWidgetComponent
    ],
    imports: [
        FuseSharedModule,
        FuseWidgetModule,
        KM8SharedModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        NzFormModule,
        NzRadioModule,
        NzSelectModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzDropDownModule,
        NzDatePickerModule,
        NzSpinModule
    ],
    exports: [
        ParentPaymentSummaryWidgetComponent,
        ParentPaymentOverdueWidgetComponent
    ]
})
export class ParentPaymentWidgetModule { }
