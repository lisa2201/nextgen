import {NgModule} from '@angular/core';

import {RouterModule} from '@angular/router';
import {FuseSidebarModule} from '@fuse/components';
import {FuseSharedModule} from '@fuse/shared.module';
import {TranslateModule} from '@ngx-translate/core';
import {KM8SharedModule} from 'app/shared/shared.module';
import {DynamicModule} from 'ng-dynamic-component';

import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatToolbarModule} from '@angular/material/toolbar';

import {NzToolTipModule} from 'ng-zorro-antd/tooltip';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzRadioModule} from 'ng-zorro-antd/radio';
import {NzFormModule} from 'ng-zorro-antd/form';
import {NzSpinModule} from 'ng-zorro-antd/spin';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzCheckboxModule} from 'ng-zorro-antd/checkbox';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzSwitchModule} from 'ng-zorro-antd/switch';
import {NzUploadModule} from 'ng-zorro-antd/upload';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzListModule} from 'ng-zorro-antd/list';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzEmptyModule} from 'ng-zorro-antd/empty';
import {NzDropDownModule} from 'ng-zorro-antd/dropdown';
import {NzTabsModule} from 'ng-zorro-antd/tabs';
import {NzDividerModule} from 'ng-zorro-antd/divider';
import {NzPaginationModule} from 'ng-zorro-antd/pagination';
import {NzBadgeModule} from 'ng-zorro-antd/badge';

import {TooltipModule} from 'ng2-tooltip-directive';
import {CountryResolverService} from 'app/main/modules/waitlist-form-config/services/country-resolver.service';
import {AuthGuard} from 'app/shared/guard/auth.guard';

import {EditEnrolmentComponent} from './list-view/dialogs/edit-enrolment/edit-enrolment.component';
import {EditWaitlistComponent} from './list-view/dialogs/edit-waitlist/edit-waitlist.component';
import {ViewEnrollmentComponent} from './list-view/dialogs/view-enrollment/view-enrollment.component';
import {ViewWaitlistComponent} from './list-view/dialogs/view-waitlist/view-waitlist.component';
import {ListViewComponent} from './list-view/list-view.component';
import {WaitListEnrollmentService} from './service/waitlist-enrollment.service';
import {WaitlistEnrollmentListComponent} from './waitlist-enrollment-list/waitlist-enrollment-list.component';
import {NzAlertModule, NzAvatarModule} from 'ng-zorro-antd';
import {SidenavComponent} from './sidenav/sidenav.component';
import {NewInputComponent} from './list-view/dialogs/new-input/new-input.component';
import {S3UploadModule} from 'app/shared/components';
import {EnrollmentsService} from 'app/main/modules/waitlist-form-config/services/enrollments.service';
import {SetChildRoomsComponent} from './modals/set-child-rooms/set-child-rooms.component';
import {ChildrenService} from '../child/services/children.service';
import {ViewNoteComponent} from './notes/view-note/view-note.component';
import {ListNoteComponent} from './notes/view-note/list-note/list-note.component';
import {AddNoteComponent} from './notes/view-note/add-note/add-note.component';
import {BranchesListComponent} from './list-view/dialogs/branches-list/branches-list.component';
import {CKEditorModule} from '@ckeditor/ckeditor5-angular';
import {ViewDynamicDataComponent} from './list-view/dialogs/view-dynamic-data/view-dynamic-data.component';
import {WaitlistEnrolmentNotesService} from './service/waitlist-enrolment-notes.service';
import {SignaturePadModule} from 'angular2-signaturepad';
import {EditEnquiryComponent} from './list-view/dialogs/edit-enquiry/edit-enquiry.component';

const routes = [
    {
        path: '',
        component: WaitlistEnrollmentListComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N26',
            permissions: ['AC0'],
            title: 'CRM Dashboard'
        },
        resolve: {
            room: WaitListEnrollmentService,
            resolveData: CountryResolverService,
        },
    },
];

@NgModule({
    declarations: [
        WaitlistEnrollmentListComponent,
        ListViewComponent,
        ViewWaitlistComponent,
        ViewEnrollmentComponent,
        EditWaitlistComponent,
        EditEnrolmentComponent,
        SidenavComponent,
        NewInputComponent,
        ViewNoteComponent,
        ListNoteComponent,
        AddNoteComponent,
        BranchesListComponent,
        SetChildRoomsComponent,
        ViewDynamicDataComponent,
        EditEnquiryComponent
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
        NzBadgeModule,
        NzDatePickerModule,
        NzUploadModule,
        NzAlertModule,

        NzToolTipModule,

        TooltipModule,

        DynamicModule.forRoot(),

        S3UploadModule,
        NzAvatarModule,
        CKEditorModule,
        SignaturePadModule,
    ],
    exports: [
        ListNoteComponent
    ],
    providers: [
        WaitListEnrollmentService,
        CountryResolverService,
        EnrollmentsService,
        ChildrenService,
        WaitlistEnrolmentNotesService
    ]
})
export class WaitlistEnrollmentModule {
}
