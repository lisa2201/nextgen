import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusListComponent } from './bus-list.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
    NzFormModule,
    NzInputModule,
    NzTableModule,
    NzEmptyModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzModalModule,
    NzCheckboxModule, NzLayoutModule, NzPaginationModule, NzDividerModule
} from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { BusListService } from './services/bus-list.service';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NewOrEditBusComponent} from './dialogs/new-or-edit-bus/new-or-edit-bus.component';
import {MatTabsModule} from '@angular/material/tabs';
import {NewOrEditSchoolComponent} from './dialogs/new-or-edit-school/new-or-edit-school.component';
import {ViewChildrenInBusComponent} from './dialogs/view-children-in-bus/view-children-in-bus.component';
import {ChildrenService} from '../../child/services/children.service';
import {ViewChildrenInSchoolComponent} from './dialogs/view-children-in-school/view-children-in-school.component';


const routes: Routes = [
    {
        path: '',
        component: BusListComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N59',
            permissions: ['AC0'],
            title: 'Bus List'
        },
        resolve:
        {
            resolveData: BusListService
        }
    }
];

@NgModule({
    declarations: [
        BusListComponent, 
        NewOrEditBusComponent, 
        NewOrEditSchoolComponent, 
        ViewChildrenInBusComponent, 
        ViewChildrenInSchoolComponent
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
        NzSelectModule,
        NzLayoutModule,
        NzPaginationModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatMenuModule,
        MatTabsModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule,
        NzCheckboxModule,
        NzDividerModule,
    ],
    providers: [
        ChildrenService,
        BusListService
    ]
})
export class BusListModule { }
