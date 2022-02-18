import {NgModule} from '@angular/core';
import {ChildNotesComponent} from './child-notes.component';
import {AuthGuard} from 'app/shared/guard/auth.guard';
import {RouterModule} from '@angular/router';
import {TranslateModule} from '@ngx-translate/core';
import {FuseSharedModule} from '@fuse/shared.module';
import {KM8SharedModule} from 'app/shared/shared.module';
import {RyTimePickerModule, S3UploadModule} from 'app/shared/components';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
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
import {FuseSidebarModule} from '@fuse/components';
import {TooltipModule} from 'ng2-tooltip-directive';
import {ChildService} from '../services/child.service';
import {ListNoteComponent} from './list-note/list-note.component';
import {WaitlistEnrolmentNotesService} from '../../waitlist-enrollment/service/waitlist-enrolment-notes.service';

const routes = [
    {
        path: 'notes',
        component: ChildNotesComponent,
        canActivate: [
            AuthGuard
        ],
        data:
            {
                belongsTo: 'N07',
                permissions: ['AC0'],
                title: 'Child - Notes'
            },
        resolve:
            {
                consentsData: ChildService
            }
    }
];

@NgModule({
    declarations: [
        ChildNotesComponent,
        ListNoteComponent],
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
        NzAvatarModule,
    ],
    providers:[
        WaitlistEnrolmentNotesService
    ]
})
export class NotesModule {
}
