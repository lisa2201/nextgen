import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { HealthMedicalComponent } from './health-medical.component';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { RyTimePickerModule } from 'app/shared/components';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NzFormModule, NzSelectModule, NzSpinModule, NzEmptyModule, NzButtonModule, NzIconModule, NzRadioModule, NzInputModule, NzCheckboxModule, NzDropDownModule, NzTabsModule, NzGridModule, NzSwitchModule, NzTableModule, NzDatePickerModule, NzModalModule, NzAlertModule, NzSkeletonModule, NzListModule, NzCardModule, NzDividerModule } from 'ng-zorro-antd';
import { FuseSidebarModule } from '@fuse/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import { HealthMedicalService } from './services/health-medical.service';
import { NewOrEditAllergyComponent } from './new-or-edit-allergy/new-or-edit-allergy.component';
import { AllergyListViewComponent } from './list-view/list-view.component';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';
import { ChildDocumentsService } from '../documents/services/child-documents.service';


const routes = [
    {
        path: 'health-medical',
        component: HealthMedicalComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N29',
            permissions: ['AC0'],
            title: 'Child - Health & Medical'
        },
        resolve:
        {
            allergiesData: HealthMedicalService
        }
    }
];

@NgModule({
    declarations: [
        HealthMedicalComponent,
        NewOrEditAllergyComponent,
        AllergyListViewComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,
        KM8SharedModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        RyTimePickerModule,

        NzFormModule,
        NzSelectModule,
        NzSpinModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTabsModule,
        NzGridModule,
        NzSwitchModule,
        NzTableModule,
        NzDatePickerModule,
        NzModalModule,
        NzAlertModule,
        NzSkeletonModule,
        NzListModule,
        NzCardModule,
        NzDividerModule,

        FuseSidebarModule,

        TooltipModule,
        NzAvatarModule
    ],
    providers: [
        HealthMedicalService,
        ChildDocumentsService
    ]
})
export class HealthMedicalModule { }
