import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { FuseSidebarModule } from '@fuse/components/sidebar/sidebar.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';
import { TooltipModule } from 'ng2-tooltip-directive';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ChildEnrolmentService } from './services/enrolment.service';
import { ChildBookingService } from '../booking/services/booking.service';
import { CcsEntitlementHistoryService } from './services/ccs-entitlement-history.service';

import { ChildEnrolmentComponent } from './enrolment.component';
import { ChildSetCRNComponent } from './modals/set-crn/set-crn.component';
import { ChildEnrolmentStatusHistoryComponent } from './status-history/status-history.component';
import { ChildSetEnrolmentSessionComponent } from './modals/set-enrolment-session/set-enrolment-session.component';
import { ChildEntitlementComponent } from './entitlement/entitlement.component';
import { ChildEnrolmentHistoryComponent } from './enrolment-history/enrolment-history.component';
import { EntitlementHistoryComponent} from './entitlement-history/entitlement-history.component';
import { ChildEndEnrolmentComponent } from './modals/end-enrolment/end-enrolment.component';
import { ChildEnrolmentChangeLogComponent } from './change-log/change-log.component';

const routes = [
    {
        path: 'enrolment',
        component: ChildEnrolmentComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N23',
            permissions: ['AC0'],
            title: 'Child - Enrolment - New'
        },
        resolve:
        {
            child: ChildEnrolmentService
        }
    },
    {
        path: 'enrolment/:enrolment_id',
        component: ChildEnrolmentComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N23',
            permissions: ['AC1'],
            title: 'Child - Enrolment - Edit'
        },
        resolve:
        {
            child: ChildEnrolmentService
        }
    }
];

@NgModule({
    declarations: [
        ChildEnrolmentComponent,
        ChildEnrolmentStatusHistoryComponent,
        ChildSetCRNComponent,
        ChildSetEnrolmentSessionComponent,
        ChildEntitlementComponent,
        ChildEnrolmentHistoryComponent,
        EntitlementHistoryComponent,
        ChildEndEnrolmentComponent,
        ChildEnrolmentChangeLogComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,
        KM8SharedModule,

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
        NzDividerModule,

        RyTimePickerModule,

        TooltipModule,
        FuseSidebarModule
    ],
    providers: [
        ChildEnrolmentService,
        ChildBookingService,
        CcsEntitlementHistoryService
    ]
})

export class CCSEnrolmentModule { }
