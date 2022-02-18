import {AfterViewInit, Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import * as _ from 'lodash';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {ProfileSettingService} from '../../services/profile-setting.service';
import {NotificationService} from 'app/shared/service/notification.service';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {AppConst} from 'app/shared/AppConst';

@Component({
    selector: 'email-notifications',
    templateUrl: './email-notifications.component.html',
    styleUrls: ['./email-notifications.component.scss']
})
export class EmailNotificationsComponent implements OnInit, AfterViewInit {


    emailNotificationForm: FormGroup;
    buttonLoader: boolean;
    emailNotification: any = [];

    private _unsubscribeAll: Subject<any>;

    constructor(
        private _formBuilder: FormBuilder,
        private _profileSettingService: ProfileSettingService,
        private _notification: NotificationService,
    ) {
        this.buttonLoader = false;
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this._profileSettingService.onDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((userData: any) => {
                console.log('userData.user')
                console.log(userData.user.emailNotification)
                this.emailNotification = userData.user.emailNotification;
                this.emailNotificationForm = this.createForm();
            });
    }

    ngAfterViewInit(): void {


    }


    /**
     * Create health medical form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup {
        return this._formBuilder.group({
            enquiry: new FormControl(_.isEmpty(this.emailNotification[this.emailNotification.findIndex(x => x.type === AppConst.appStart.ENQUIRY.EMAIL_NOTIFICATION)]) ? true : this.emailNotification[this.emailNotification.findIndex(x => x.type === AppConst.appStart.ENQUIRY.EMAIL_NOTIFICATION)].pivot.status),
            waitlist: new FormControl(_.isEmpty(this.emailNotification[this.emailNotification.findIndex(x => x.type === AppConst.appStart.WAITLIST.EMAIL_NOTIFICATION)]) ? true : this.emailNotification[this.emailNotification.findIndex(x => x.type === AppConst.appStart.WAITLIST.EMAIL_NOTIFICATION)].pivot.status),
            enrolment: new FormControl(_.isEmpty(this.emailNotification[this.emailNotification.findIndex(x => x.type === AppConst.appStart.ENROLLMENT.EMAIL_NOTIFICATION)]) ? true : this.emailNotification[this.emailNotification.findIndex(x => x.type === AppConst.appStart.ENROLLMENT.EMAIL_NOTIFICATION)].pivot.status),
        })
    }

    get fv(): any {
        return this.emailNotificationForm.value;
    }

    submit(e: MouseEvent): void {
        if (e)
            e.preventDefault();

        const sendObj = {
            enquiry: {type: AppConst.appStart.ENQUIRY.EMAIL_NOTIFICATION, status: !!this.fv.enquiry},
            waitlist: {type: AppConst.appStart.WAITLIST.EMAIL_NOTIFICATION, status: !!this.fv.waitlist},
            enrolment: {type: AppConst.appStart.ENROLLMENT.EMAIL_NOTIFICATION, status: !!this.fv.enrolment},
        };

        this.buttonLoader = true;
        this._profileSettingService
            .updateUserEmailNotification(sendObj)
            .pipe()
            .subscribe(
                response => {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);

                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },
            );
    }


}
