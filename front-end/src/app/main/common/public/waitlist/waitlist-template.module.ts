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
import {NgxChartsModule} from '@swimlane/ngx-charts';

import {CountryResolverService} from './services/country-resolver.service';
import {EnrollmentService} from './services/enrollment.service';
import {EnrollmentsService} from './services/enrollments.service';

import {DeclarationDialogComponent} from './declaration-dialog/declaration-dialog.component';
import {WaitListFormComponent} from './waitlist-template-form/wait-list-form.component';

import {EnquiryFormComponent} from './enquiry-form/enquiry-form.component';
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
import {FuseConfirmDialogModule, FuseMaterialColorPickerModule} from '@fuse/components';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatCardModule} from '@angular/material/card';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatGridListModule} from '@angular/material/grid-list';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ReactiveFormsModule} from '@angular/forms';
import {EnrollmentFormResolverService} from './enrollment-form/enrollment-form-resolver.service';
import {EnquiryResolverService} from './enquiry-form/enquiry-resolver.service';
import {SignaturePadModule} from 'angular2-signaturepad';
import {RouteGuard} from 'app/shared/guard/route.guard';
import {S3UploadModule} from 'app/shared/components';
import {WaitlistFormResolverService} from './waitlist-template-form/waitlist-form-resolver.service';
import {SectionComponent} from './sections/section-enrol/section.component';
import {SectionWaitlistComponent} from './sections/section-waitlist/section-waitlist.component';
import {S3UploadDirectService} from 'app/shared/components/s3-upload/s3-upload-direct.service';
import {EmailAttachmentService} from './services/email-attachment.service';
import {EnquiryService} from './services/enquiry.service';
import {NzAlertModule} from 'ng-zorro-antd';
import {CKEditorModule} from '@ckeditor/ckeditor5-angular';
import {SectionService} from './services/section.service';

const routes: Routes = [
    {
        path: 'waitlist-form',
        component: WaitListFormComponent,
        data: {
            title: 'Waitlist'
        },
        resolve: {
            countryList: CountryResolverService,
            sectionsSet: WaitlistFormResolverService,
        }
    },
    {
        path: 'waitlist-form/:id',
        component: WaitListFormComponent,
        data: {
            title: 'Waitlist'
        },
        resolve: {
            countryList: CountryResolverService,
            sectionsSet: WaitlistFormResolverService,
            resolveData: EnquiryService,
        }
    },
    {
        path: 'enrolment-form',
        canActivate: [
            RouteGuard
        ],
        component: EnrollmentFormComponent,
        data: {
            title: 'Enrolment'
        },
        resolve: {
            countryList: CountryResolverService,
            sectionsSet: EnrollmentFormResolverService,
        }
    },
    {
        path: 'enrolment-form/:id',
        component: EnrollmentFormComponent,
        data: {
            title: 'Enrolment'
        },
        resolve: {
            resolveData: EnrollmentService,
            countryList: CountryResolverService,
            sectionsSet: EnrollmentFormResolverService,
        }
    },
    {
        path: 'enquiry-form',
        component: EnquiryFormComponent,
        data: {
            title: 'Enquiry'
        },
        resolve: {
            sectionsSet: EnquiryResolverService,
        }
    },
    {
        path: 'enquiry-form/:id',
        component: EnquiryFormComponent,
        data: {
            title: 'Enquiry'
        },
        resolve: {
            sectionsSet: EnquiryResolverService,
        }
    }
];

@NgModule({
    declarations: [
        WaitListFormComponent,
        EnrollmentFormComponent,
        EnquiryFormComponent,
        DeclarationDialogComponent,
        SectionComponent,
        SectionWaitlistComponent
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
        SignaturePadModule,
        NgxDnDModule,

        FuseSharedModule,
        FuseConfirmDialogModule,
        FuseMaterialColorPickerModule,
        MatCardModule,
        DragDropModule,
        MatExpansionModule,
        MatSlideToggleModule,
        MatGridListModule,
        BrowserAnimationsModule,
        ReactiveFormsModule,

        S3UploadModule,
        NzAlertModule,
        CKEditorModule
    ],
    providers: [
        CountryResolverService,
        EnrollmentService,
        EnrollmentsService,
        S3UploadDirectService,
        EmailAttachmentService,
        EnquiryService,
        EnquiryResolverService,
        SectionService
    ],
})
export class WaitlistTemplateModule {
}
