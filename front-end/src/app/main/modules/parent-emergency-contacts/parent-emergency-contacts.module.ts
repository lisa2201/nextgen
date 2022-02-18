import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'ng2-tooltip-directive';

import { EmergencyContactViewComponent } from './emergency-contact-view/emergency-contact-view.component';
import { AuthGuard } from '../../../shared/guard/auth.guard';
import { FuseSharedModule } from '../../../../@fuse/shared.module';
import { KM8SharedModule } from '../../../shared/shared.module';
import {
    NzAvatarModule,
    NzDatePickerModule,
    NzDividerModule,
    NzDropDownModule,
    NzGridModule,
    NzLayoutModule,
    NzListModule,
    NzPaginationModule,
    NzRadioModule,
    NzTableModule,
    NzTabsModule,
} from 'ng-zorro-antd';
import { NewOrEditEmergencyComponent } from './emergency-contact-view/dialogs/new-or-edit-emergency/new-or-edit-emergency.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { EmergencyContactService } from './emergency-contact-view/services/emergency-contact.service';
import { MatMenuModule } from '@angular/material/menu';

const routes = [
    {
        path: '',
        component: EmergencyContactViewComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N11',
            permissions: ['AC0']
        },
        resolve: {
            emergency: EmergencyContactService
        },
    },
];

@NgModule({
    declarations: [EmergencyContactViewComponent, NewOrEditEmergencyComponent],
    imports: [
        RouterModule.forChild(routes),
        TranslateModule,

        FuseSharedModule,
        KM8SharedModule,

        CommonModule,

        MatToolbarModule,
        MatIconModule,
        MatDialogModule,
        MatFormFieldModule,
        MatButtonModule,

        TooltipModule,

        NzListModule,
        NzFormModule,
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzCheckboxModule,
        NzCollapseModule,
        NzSpinModule,
        NzSwitchModule,
        NzRadioModule,
        NzSelectModule,
        NzDropDownModule,
        NzLayoutModule,
        NzAvatarModule,
        NzGridModule,
        NzAlertModule,
        NzBadgeModule,
        NzToolTipModule,
        // delete

        NzTabsModule,
        NzDividerModule,
        NzTableModule,
        NzPaginationModule,
        NzDatePickerModule,
        MatToolbarModule,
        MatMenuModule,
    ],
    providers: [
        EmergencyContactService
    ]
})
export class ParentEmergencyContactsModule {}
