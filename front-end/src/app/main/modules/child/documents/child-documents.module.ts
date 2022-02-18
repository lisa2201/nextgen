import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ChildDocumentsComponent } from './child-documents.component';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import {RyTimePickerModule, S3UploadModule} from 'app/shared/components';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
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
    NzAvatarModule
} from 'ng-zorro-antd';
import { FuseSidebarModule } from '@fuse/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import {ChildDocumentsService} from './services/child-documents.service';
import {ChildAddNewDocumentComponent} from './dialogs/child-add-new-document.component';



const routes = [
    {
        path: 'documents',
        component: ChildDocumentsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N07',
            permissions: ['AC0'],
            title: 'Child - Documents'
        },
        resolve:
        {
            documentsData: ChildDocumentsService
        }
    }
];

@NgModule({
    declarations: [
        ChildDocumentsComponent,
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
        S3UploadModule,
        NzAvatarModule
    ],
    providers: [
        ChildDocumentsService
    ]
})
export class ChildDocumentsModule { }
