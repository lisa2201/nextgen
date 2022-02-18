import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';

import { FuseSidebarModule } from '@fuse/components';
import { NzAvatarModule, NzLayoutModule, NzIconModule, NzEmptyModule, NzListModule, NzCardModule, NzBadgeModule, NzSelectModule, NzGridModule, NzRateModule, NzRadioModule, NzButtonModule, NzDividerModule, NzSkeletonModule, NzTabsModule, NzSpinModule, NzCheckboxModule, NzDatePickerModule, NzFormModule, NzInputModule, NzCollapseModule, NzSwitchModule } from 'ng-zorro-antd';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { TooltipModule } from 'ng2-tooltip-directive';
import { KM8SharedModule } from 'app/shared/shared.module';
import { ParentChildNavigateComponent } from './parent-child-navigate/parent-child-navigate.component';
import { ViewCwaContentComponent } from './view-cwa-content/view-cwa-content.component';
import { ParentChildrenService } from './service/parent-children.service';
import { ChildrenComponent } from './children/children.component';
import { ParentChildService } from './service/parent-child.service';
import { EditChildInfoDialogComponent } from './edit-child-info-dialog/edit-child-info-dialog.component';
import { ChildDocumentsService } from '../child/documents/services/child-documents.service';
import { ChildrenService } from '../child/services/children.service';
import { S3UploadModule } from 'app/shared/components/s3-upload/s3-upload.module';
import { AddNewAllergyComponent } from './add-new-allergy/add-new-allergy.component';
import { ChildDocumentsModule } from '../child/documents/child-documents.module';
import { AddNewDocumentComponent } from './add-new-document/add-new-document.component';
import { ImmunisationTrackingModule } from '../child/immunisation-tracking/immunisation-tracking.module';
import { ImmunisationTrackingService } from '../child/immunisation-tracking/service/immunisation-tracking.service';


const routes = [
    {
        path: '',
        canActivate: [AuthGuard],
        component: ParentChildNavigateComponent,
        data: {
            belongsTo: 'N11',
            permissions: ['AC0']
        },
        resolve: {
            children: ParentChildrenService
        }
    },
    {
        path: ':id',
        canActivate: [AuthGuard],
        component: ChildrenComponent,
        data: {
            belongsTo: 'N11',
            permissions: ['AC0']
        },
        resolve: {
            child: ParentChildService
        }
    }
];

@NgModule({
    declarations: [
        ChildrenComponent,
        ParentChildNavigateComponent,
        ViewCwaContentComponent,
        EditChildInfoDialogComponent,
        AddNewAllergyComponent,
        AddNewDocumentComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        TranslateModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatDividerModule,
        MatTabsModule,
        MatToolbarModule,
        MatDialogModule,

        FuseSharedModule,
        KM8SharedModule,
        FuseSidebarModule,

        NzAvatarModule,
        NzLayoutModule,
        NzIconModule,
        NzEmptyModule,
        NzListModule,
        NzCardModule,
        NzBadgeModule,
        NzSelectModule,
        NzGridModule,
        NzRateModule,
        NzRadioModule,
        NzButtonModule,
        NzDividerModule,
        NzSkeletonModule,
        NzTabsModule,
        NzSpinModule,
        NzCheckboxModule,
        NzDatePickerModule,
        NzFormModule,
        NzInputModule,
        NzCollapseModule,
        NzSwitchModule,

        TooltipModule,

        InfiniteScrollModule,
        S3UploadModule,
        ChildDocumentsModule,
        ImmunisationTrackingModule
    ],
    providers: [
        ParentChildrenService, 
        ParentChildService,
        ChildDocumentsService,
        ChildrenService,
        ImmunisationTrackingService
    ]
})
export class ParentChildModule {}
