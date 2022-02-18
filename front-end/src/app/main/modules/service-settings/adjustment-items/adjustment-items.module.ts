import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdjustmentItemsComponent } from './adjustment-items.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { AddAdjustmentItemsDialogComponent } from './dialogs/add-adjustment-items-dialog/add-adjustment-items-dialog.component';
import { AdjustmentItemsListViewComponent } from './adjustment-items-list-view/adjustment-items-list-view.component';
import { AdjustmentItemsLeftSidenavComponent } from './sidenavs/left/adjustment-items-left-sidenav/adjustment-items-left-sidenav.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzGridModule, NzModalModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { AdjustmentItemsService } from './services/adjustment-items.service';
import { AdjustmentItemsListResolverService } from './services/adjustment-items-list-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: AdjustmentItemsComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N42',
            permissions: ['AC0'],
            title: 'Adjustment Items'
        },
        resolve:
        {
            resolveData: AdjustmentItemsListResolverService
        }
    }
];

@NgModule({
    declarations: [
        AdjustmentItemsComponent,
        AddAdjustmentItemsDialogComponent,
        AdjustmentItemsListViewComponent,
        AdjustmentItemsLeftSidenavComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),

        FlexLayoutModule,

        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzGridModule,
        NzModalModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatMenuModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        AdjustmentItemsService,
        AdjustmentItemsListResolverService
    ]
})
export class AdjustmentItemsModule { }
