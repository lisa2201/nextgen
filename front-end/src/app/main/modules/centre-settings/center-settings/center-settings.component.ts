import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { FileListItem } from 'app/shared/components/s3-upload/s3-upload.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';

import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { CenterSettingsService } from './service/center-settings.service';

@Component({
    selector: 'center-settings',
    templateUrl: './center-settings.component.html',
    styleUrls: ['./center-settings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CenterSettingsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    uploadTypes: string;
    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    buttonLoader: boolean;

    centerSettingsData: any;

    selectedTab: number;

    constructor(
        private _authService: AuthService,
        private _centerSettingsService: CenterSettingsService,
        private _notification: NotificationService,
        private _logger: NGXLogger,
        private _commonService: CommonService
        // private _providerNotificationService: ProviderNotificationService
    ) {
        this._unsubscribeAll = new Subject();

        this.uploadTypes = 'image/*';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.CHILD_Profile;
        this.uploadFileMap = {};
    }

    ngOnInit(): void
    {
        this._centerSettingsService.getClientInformation();
        this._centerSettingsService
            .onCenterSettingsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => this.centerSettingsData = response);
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void
    {
        this.uploadFileMap = {};
        this.uploadFileMap[inputName] = _.map(fileList, 'key');
        this.onFormSubmit(null);
    }

    ngOnDestroy(): void
    {
       // Unsubscribe from all subscriptions
       this._unsubscribeAll.next();
       this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    onTabChange(tabIndex: number): void
    {
        this.selectedTab = tabIndex;
    }

    onFormSubmit(e: MouseEvent): void
    {
        if(e)
            e.preventDefault();

        const sendObj = {
            branch_id: this._authService.getClient().id,
            upload_file: this.uploadFileMap
        };

        this._centerSettingsService
            .setBusinessLogo(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {
                    this._centerSettingsService.getClientInformation();
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

    getBranchLogo(): string
    {
       return (this.centerSettingsData.branch_logo) ? this._commonService.getS3FullLink(this.centerSettingsData.branch_logo) : `assets/images/logos/KMLOGO.png`;
    }
}
