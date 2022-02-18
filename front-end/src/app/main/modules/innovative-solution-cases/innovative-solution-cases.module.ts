import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';

import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzPaginationModule, NzRadioModule, NzDropDownModule, NzLayoutModule, NzAvatarModule, NzGridModule, NzTableModule, NzDatePickerModule, NzDividerModule, NzDescriptionsModule} from 'ng-zorro-antd';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { FuseSidebarModule } from '@fuse/components';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { InnovativeSolutionCasesComponent } from './innovative-solution-cases.component';
import { InnovativeSolutionCasesListViewComponent } from './list-view/list-view.component';
import { InnovativeSolutionCasesDetailViewComponent } from './detail-view/detail-view.component';
import { InnovativeSolutionCasesSideBarComponent } from './side-bar/side-bar.component';
import { InnovativeSolutionCasesService } from './service/innovative-solution-cases.service';
import { InnovativeCaseDetailResolverService } from './service/case-detail-view.service';
import { InnovativeSolutionCasesClaimsService } from '../innovative-solution-cases-claims/service/innovative-solution-case-claims.service';
import {QueryPaymentsService} from '../query-payments/services/query-payments.service';

const routes = [
    {
        path: '',
        component: InnovativeSolutionCasesComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Innovative Solution Cases'
        },
        resolve: {
            services: InnovativeSolutionCasesService
        }
    },
    {
        path: ':id/view',
        component: InnovativeSolutionCasesDetailViewComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Innovative Solution Cases - Detail'
        },
        resolve: {
            resolveData: InnovativeCaseDetailResolverService
        }
    }

];
@NgModule({
    declarations: [
        InnovativeSolutionCasesListViewComponent,
        InnovativeSolutionCasesComponent,
        InnovativeSolutionCasesDetailViewComponent,
        InnovativeSolutionCasesSideBarComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        NzPaginationModule,
        TranslateModule,
        FuseSharedModule,
        KM8SharedModule,
        FuseSidebarModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

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
        NzTableModule,
        NzDatePickerModule,
        NzDividerModule,
        NzDescriptionsModule,

    ],
    providers: [
        InnovativeSolutionCasesService,
        InnovativeCaseDetailResolverService,
        InnovativeSolutionCasesClaimsService
    ]
})
export class InnovativeSolutionModule {}
