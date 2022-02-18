import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import {NzModalService, helpMotion, NzModalRef} from 'ng-zorro-antd';
import { AuthService } from 'app/shared/service/auth.service';
import {finalize, takeUntil} from 'rxjs/operators';
import { ProfileSettingService } from '../../services/profile-setting.service';
import { Subject } from 'rxjs';
import { User } from 'app/main/modules/user/user.model';
import { FormGroup } from '@angular/forms';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import * as _ from 'lodash';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import {AppConst} from '../../../../../shared/AppConst';
import {FileListItem} from '../../../../../shared/components/s3-upload/s3-upload.model';

@Component({
    selector: 'user-profile-image',
    templateUrl: './user-profile-image.component.html',
    styleUrls: ['./user-profile-image.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]

})
export class UserProfileImageComponent implements OnInit, OnDestroy {

    userData: User;
    child: any[];
    profileForm: FormGroup;


    uploadTypes: string;
    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    buttonLoader: boolean;
    confirmModal: NzModalRef;

    private _unsubscribeAll: Subject<any>;


    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _profileSettingService: ProfileSettingService,
        private _modalService: NzModalService,
        private _authService: AuthService,
    ) {



        this.buttonLoader = false;

        this.uploadTypes = 'image/*';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.STAFF;
        this.uploadFileMap = {};

        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {


        this._profileSettingService.onDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((userData: any) => {
                this._logger.debug('[user-data]', userData);
                this.userData = userData.user;
                this.child = userData.child;

            });
    }


    /**
     * update from
     */
    onSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        const sendObj = {
            reference: this.userData.id,
            upload_file: this.uploadFileMap,
        }

        this._logger.debug('[user object]', sendObj);

        this.buttonLoader = true;

        this._profileSettingService
            .updateUserImageOnly(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {
                    this.userData = res.userData;

                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );

    }

    deleteImage(e: MouseEvent): void {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete the image?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                reference: this.userData.id,
                            }
                            this._profileSettingService
                                .deleteUserImageOnly(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        this.buttonLoader = false;
                                        resolve();
                                    }),
                                )
                                .subscribe(
                                    res =>
                                    {
                                        this.userData = res.userData;

                                        this._notification.clearSnackBar();

                                        setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                                    },
                                    error =>
                                    {
                                        throw error;
                                    },
                                    () =>
                                    {
                                        this._logger.debug('😀 all good. 🍺');
                                    }
                                );
                        });
                    }
                }
            );


    }


    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.uploadFileMap[inputName] = _.map(fileList, 'key');
    }


}
