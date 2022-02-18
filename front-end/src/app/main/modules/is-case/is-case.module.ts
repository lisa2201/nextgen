import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsCaseListComponent } from './is-case-list/is-case-list.component';
import { IsCaseListViewComponent } from './is-case-list/is-case-list-view/is-case-list-view.component';
import { IsCaseListLeftSidenavComponent } from './is-case-list/sidenavs/left/is-case-list-left-sidenav/is-case-list-left-sidenav.component';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzDescriptionsModule, NzPaginationModule, NzAlertModule, NzToolTipModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { IsCaseService } from './services/is-case.service';
import { IsCaseDetailComponent } from './is-case-detail/is-case-detail.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { IsCaseDetailResolverService } from './services/is-case-detail-resolver.service';
import { CreateIsClaimDialogComponent } from './dialogs/create-is-claim-dialog/create-is-claim-dialog.component';
import { IsClaimAddEducatorDialogComponent } from './dialogs/is-claim-add-educator-dialog/is-claim-add-educator-dialog.component';
import { IsCaseApiTimeConverterPipe } from './is-case-api-time-converter.pipe';
import { IsCaseClaimListComponent } from './is-case-claim-list/is-case-claim-list.component';
import { IsCaseClaimDetailComponent } from './is-case-claim-detail/is-case-claim-detail.component';
import { IsCaseClaimListViewComponent } from './is-case-claim-list/is-case-claim-list-view/is-case-claim-list-view.component';
import { IsCaseClaimListLeftSidenavComponent } from './is-case-claim-list/sidenavs/left/is-case-claim-list-left-sidenav/is-case-claim-list-left-sidenav.component';
import { IsCaseClaimDetailResolverService } from './services/is-case-claim-detail-resolver.service';
import { IsClaimPaymentDetailDialogComponent } from './dialogs/is-claim-payment-detail-dialog/is-claim-payment-detail-dialog.component';
import { IsCaseClaimSubmissionsListViewComponent } from './is-case-claim-list/is-case-claim-submissions-list-view/is-case-claim-submissions-list-view.component';
import { IsCaseClaimListResolverService } from './services/is-case-claim-list-resolver.service';

const APP_ROUTES: Routes = [
    {
        path: 'cases',
        component: IsCaseListComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Inclusive Support Cases'
        }
    },
    {
        path: 'claims',
        component: IsCaseClaimListComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Inclusive Support Case Claims'
        },
        resolve: {
            resolveData: IsCaseClaimListResolverService
        }
    },
    {
        path: 'cases/:id',
        component: IsCaseDetailComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Inclusive Support Cases - Detail'
        },
        resolve: {
            resolveData: IsCaseDetailResolverService
        }
    },
    {
        path: 'claims/:id',
        component: IsCaseClaimDetailComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Inclusive Support Case Claims - Detail'
        },
        resolve: {
            resolveData: IsCaseClaimDetailResolverService
        }
    }
];

@NgModule({
    declarations: [
        IsCaseListComponent,
        IsCaseListViewComponent,
        IsCaseListLeftSidenavComponent,
        IsCaseDetailComponent,
        CreateIsClaimDialogComponent,
        IsClaimAddEducatorDialogComponent,
        IsCaseApiTimeConverterPipe,
        IsCaseClaimListComponent,
        IsCaseClaimDetailComponent,
        IsCaseClaimListViewComponent,
        IsCaseClaimListLeftSidenavComponent,
        IsClaimPaymentDetailDialogComponent,
        IsCaseClaimSubmissionsListViewComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,

        FlexLayoutModule,

        NzDatePickerModule,
        NzDividerModule,
        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzGridModule,
        NzSelectModule,
        NzDescriptionsModule,
        NzPaginationModule,
        NzCheckboxModule,
        NzAlertModule,
        NzToolTipModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        IsCaseService,
        IsCaseDetailResolverService,
        IsCaseClaimDetailResolverService,
        IsCaseClaimListResolverService,
        IsCaseApiTimeConverterPipe
    ]
})
export class IsCaseModule { }
