import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

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
import {NzCollapseModule} from 'ng-zorro-antd/collapse';
import {NzResultModule} from 'ng-zorro-antd/result';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzSwitchModule} from 'ng-zorro-antd/switch';
import {NzUploadModule} from 'ng-zorro-antd/upload';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {FuseWidgetModule} from '@fuse/components/widget/widget.module';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from '@angular/material/divider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatMenuModule} from '@angular/material/menu';
import {MatSelectModule} from '@angular/material/select';
import {MatTableModule} from '@angular/material/table';
import {MatTabsModule} from '@angular/material/tabs';

import {CountryResolverService} from './services/country-resolver.service';
import {EnrollmentService} from './services/enrollment.service';
import {EnrollmentsService} from './services/enrollments.service';

import {EnquiryFormComponent} from './enquiry-form/enquiry-form.component';
import {DeclarationDialogComponent} from './declaration-dialog/declaration-dialog.component';
import {EnrollmentFormComponent} from './enrollment-form/enrollment-form.component';
import {MatDialogModule} from '@angular/material/dialog';

import {NgxCaptchaModule} from 'ngx-captcha';
import {NzNotificationModule} from 'ng-zorro-antd/notification';
import {TooltipModule} from 'ng2-tooltip-directive';
import {TranslateModule} from '@ngx-translate/core';
import {FuseSharedModule} from '@fuse/shared.module';
import {KM8SharedModule} from 'app/shared/shared.module';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatChipsModule} from '@angular/material/chips';
import {MatRippleModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgxDnDModule} from '@swimlane/ngx-dnd';
import {
    FuseConfirmDialogModule,
    FuseMaterialColorPickerModule,
    FuseProgressBarModule,
    FuseSidebarModule
} from '@fuse/components';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatCardModule} from '@angular/material/card';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatGridListModule} from '@angular/material/grid-list';
import {InputAddComponent} from './sections/input-add/input-add.component';
// import {SignaturePadModule} from 'angular2-signaturepad';

// import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ReactiveFormsModule, FormsModule} from '@angular/forms';
import {AuthGuard} from 'app/shared/guard/auth.guard';
import {WaitlistTemplateLeftSidenavComponent} from './sidenavs/left/waitlist-template-left-sidenav/waitlist-template-left-sidenav.component';
import {SectionTemplateComponent} from './section-inputs/section-template.component';
import {EnrollmentFormResolverService} from './enrollment-form/enrollment-form-resolver.service';
import {WaitlistFormComponent} from './waitlist-form/waitlist-form.component';
import {WailtistFormResolverService} from './waitlist-form/waitlist-form-resolver.service';
import {PreviewFormComponent} from './preview-form/enrolment/preview-form.component';
import {PreviewWaitlistFormComponent} from './preview-form/waitlist/preview-form.component';
import {SectionComponent} from './preview-form/enrolment/section/section.component';
import {NzAlertModule, NzTagModule} from 'ng-zorro-antd';
import {ParagraphComponent} from './sections/input-add/paragraph/paragraph.component';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {SectionWaitlistComponent} from './preview-form/waitlist/section/section-waitlist.component';
import {SectionAddComponent} from './sections/section-add/section-add.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {EnquiryFormResolverService} from './enquiry-form/enquiry-form-resolver.service';
import {EnrolmentEmptyFormPrintConfirmComponent} from './dialog/enrolment-empty-form-print-confirm/enrolment-empty-form-print-confirm.component';
import {CKEditorModule} from '@ckeditor/ckeditor5-angular';
import {SignaturePadModule} from 'angular2-signaturepad';

const routes: Routes = [
    // {
    //     path: 'waitlist-form-template',
    //     component: WaitListFormComponent,
    //     resolve: {
    //         resolveData: WaitListFormResolverService,
    //     }
    // },
    {
        path: 'enquiry',
        component: EnquiryFormComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N57',
            permissions: ['AC0'],
            title: 'CRM - Enquiry'
        },
        resolve: {
            countryList: CountryResolverService,
            sectionsSet: EnquiryFormResolverService,
            enrolmentSet: EnrollmentFormResolverService,
            waitlistSet: WailtistFormResolverService,
        }
    },
    {
        path: 'enrollment',
        component: EnrollmentFormComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N57',
            permissions: ['AC0'],
            title: 'Manage - Enrolment'
        },
        resolve: {
            countryList: CountryResolverService,
            sectionsSet: EnrollmentFormResolverService,
        }
    },
    {
        path: 'waitlist',
        component: WaitlistFormComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N57',
            permissions: ['AC0'],
            title: 'Manage - Waitlist'
        },
        resolve: {
            countryList: CountryResolverService,
            sectionsSet: WailtistFormResolverService,
            enrolmentSet: EnrollmentFormResolverService,
        }
    }
];

@NgModule({
    declarations: [
        EnquiryFormComponent,
        EnrollmentFormComponent,
        DeclarationDialogComponent,
        InputAddComponent,
        WaitlistTemplateLeftSidenavComponent,
        SectionTemplateComponent,
        WaitlistFormComponent,
        PreviewFormComponent,
        PreviewWaitlistFormComponent,
        SectionComponent,
        ParagraphComponent,
        SectionWaitlistComponent,
        SectionAddComponent,
        EnrolmentEmptyFormPrintConfirmComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        FuseSharedModule,
        KM8SharedModule,

        NgxCaptchaModule,
        TooltipModule,
        TranslateModule,
        MatDialogModule,

        NzGridModule,
        NzNotificationModule,
        NzResultModule,
        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzIconModule,
        NzCheckboxModule,
        NzButtonModule,
        NzSpinModule,
        NzRadioModule,
        NzCollapseModule,
        NzToolTipModule,
        NzModalModule,
        NzCardModule,
        NzSwitchModule,
        NzUploadModule,
        NzDatePickerModule,
        FuseWidgetModule,
        MatIconModule,
        MatButtonModule,
        MatDividerModule,
        MatFormFieldModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        MatTableModule,
        MatTabsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatChipsModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatProgressBarModule,
        MatRippleModule,
        MatSidenavModule,
        MatToolbarModule,
        MatTooltipModule,
        // SignaturePadModule,
        NgxDnDModule,
        NzAlertModule,
        NzTagModule,

        FuseSharedModule,
        FuseConfirmDialogModule,
        FuseMaterialColorPickerModule,
        MatCardModule,
        DragDropModule,
        MatExpansionModule,
        MatSlideToggleModule,
        MatGridListModule,

        ClipboardModule,
        // BrowserAnimationsModule,
        ReactiveFormsModule,
        FuseSidebarModule,
        MatProgressSpinnerModule,
        FuseProgressBarModule,
        CKEditorModule,
        FormsModule,
        SignaturePadModule
    ],
    providers: [
        CountryResolverService,
        EnrollmentService,
        EnrollmentsService,
    ],
})
export class WaitlistTemplateModule {
}
