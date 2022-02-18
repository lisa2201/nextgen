import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { FuseSidebarModule } from '@fuse/components';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

import { TooltipModule } from 'ng2-tooltip-directive';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { S3UploadModule, SyncKinderConnectProfileModule } from '../../../shared/components';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ChildrenService } from './services/children.service';
import { ChildService } from './services/child.service';
import { ChildBookingService } from './booking/services/booking.service';
import { ChildEnrolmentService } from './enrolment/services/enrolment.service';

import { ChildComponent } from './child.component';
import { ChildListComponent } from './child-list/child-list.component';
import { ChildDetailsComponent } from './child-details/child-details.component';
import { ChildViewComponent } from './child-view/child-view.component';
import { ChildAddDialogComponent } from './dialogs/new/new.component';
import { ChildDetailNavigationComponent } from './sidenavs/right/child-detail-navigation/child-detail-navigation.component';
import { ChildSetUserComponent } from './modals/set-user/set-user.component';
import { ChildDetailsRoomsViewComponent } from './child-details/rooms-view/rooms-view.component';
import { ChildDetailsUsersViewComponent } from './child-details/users-view/users-view.component';
import { ChildSetRoomComponent } from './modals/set-room/set-room.component';
import { ChildViewRoomsViewComponent } from './child-view/rooms-view/rooms-view.component';
import { ChildViewUsersViewComponent } from './child-view/users-view/users-view.component';
import { ChildDetailsEnrolmentViewComponent } from './child-details/enrolment-view/enrolment-view.component';
import { ChildBookingViewComponent } from './child-details/booking-view/booking-view.component';
import { ShowEntitlementComponent } from './modals/show-entitlement/show-entitlement.component';
import { ChildViewCulturalBackgroundViewComponent } from './child-details/cultural-background-view/cultural-background-view.component';
import { ChildViewEmergencycontactViewComponent } from './child-details/emergency-contact-view/emergency-contact-view.component';
import { CulturalBackgroundViewComponent } from './child-view/cultural-background-view/cultural-background-view.component';
import { ChildrenFiltersComponent } from './sidenavs/left/filters/filters.component';
import { AddExistingEnrolmentComponent } from './modals/add-existing-enrolment/add-existing-enrolment.component';
import { EmergencyViewModule } from 'app/main/modules/child/emergency-view-holder/emergency-view.module';
import { ApproveCwaAdminDialogComponent } from './child-details/enrolment-view/approve-cwa-admin-dialog/approve-cwa-admin-dialog.component';
import {AddEditNoteComponent} from './notes/add-edit-note/add-edit-note.component';
import {NoteFormComponent} from './notes/add-edit-note/note-form/note-form.component';
import { ChildAddNewDocumentComponent } from './documents/dialogs/child-add-new-document.component';
const routes = [
    {
        path: '',
        component: ChildComponent,
        canActivate: [
            AuthGuard
        ],
        data: 
        {
            belongsTo: 'N07',
            permissions: ['AC0'],
            title: 'Manage Children'
        },
        resolve:
        {
            children: ChildrenService
        }
    },
    {
        path: 'child/:id',
        component: ChildViewComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N07',
            permissions: ['AC1'],
            title: 'Manage Children - Edit'
        },
        resolve:
        {
            child: ChildService
        }
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./enrolment/enrolment.module').then(m => m.CCSEnrolmentModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./booking/booking.module').then(m => m.ChildBookingModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./attendance/attendance.module').then(m => m.ChildAttendanceModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./session-submission/session-submission.module').then(m => m.ChildSessionSubmissionModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./booking-request/booking-request.module').then(m => m.BookingRequestModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./emergency-view-holder/emergency-view.module').then(m => m.EmergencyViewModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./health-medical/health-medical.module').then(m => m.HealthMedicalModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./documents/child-documents.module').then(m => m.ChildDocumentsModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./return-fee-reduction/return-fee-reduction.module').then(m => m.ReturnFeeReductionModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./accs/accs.module').then(m => m.AccsModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./immunisation-tracking/immunisation-tracking.module').then(m => m.ImmunisationTrackingModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./consents/consents.module').then(m => m.ConsentsModule)
    },
    {
        path: 'child/:id',
        loadChildren: () => import('./notes/notes.module').then(m => m.NotesModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];

@NgModule({
    declarations: [
        ChildComponent,
        ChildListComponent,
        ChildDetailsComponent,
        ChildViewComponent,
        ChildAddDialogComponent,
        ChildDetailNavigationComponent,
        ChildSetUserComponent,
        ChildSetRoomComponent,
        ChildDetailsRoomsViewComponent,
        ChildDetailsUsersViewComponent,
        ChildViewRoomsViewComponent,
        ChildViewUsersViewComponent,
        ChildDetailsEnrolmentViewComponent,
        ShowEntitlementComponent,
        ChildrenFiltersComponent,
        ChildViewEmergencycontactViewComponent,
        ChildViewCulturalBackgroundViewComponent,
        CulturalBackgroundViewComponent,
        AddExistingEnrolmentComponent,
        ApproveCwaAdminDialogComponent,
        ChildBookingViewComponent,
        AddEditNoteComponent,
        NoteFormComponent,
        ChildAddNewDocumentComponent,
    ],
    imports: [
        RouterModule.forChild(routes),

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
        NzSelectModule,
        NzSpinModule,
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzSkeletonModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTabsModule,
        NzDividerModule,
        NzGridModule,
        NzSwitchModule,
        NzTableModule,
        NzPaginationModule,
        NzDatePickerModule,
        NzAvatarModule,
        NzBadgeModule,
        NzModalModule,
        NzTagModule,
        NzToolTipModule,
        NzPopoverModule,

        TooltipModule,
        EmergencyViewModule,
        S3UploadModule,
        SyncKinderConnectProfileModule
        // InfiniteScrollModule,
    ],
    providers: [
        ChildrenService,
        ChildService,
        ChildEnrolmentService,
        ChildBookingService,
    ]
})

export class ChildModule { }
