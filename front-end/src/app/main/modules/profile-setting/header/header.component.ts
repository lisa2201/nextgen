
import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { AuthService } from 'app/shared/service/auth.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { User } from 'app/main/modules/user/user.model';
import { Child } from 'app/main/modules/child/child.model';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { valueExists } from 'app/shared/validators/asynValidator';
import { ProfileSettingService } from '../services/profile-setting.service';
import {CommonService} from '../../../../shared/service/common.service';
import {AppConst} from '../../../../shared/AppConst';

@Component({
  selector: 'user-profile-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class UserHeaderComponent implements OnInit {
    isEditBasic: boolean;
    isEditContact: boolean;
    isLoadingBasicData: boolean;
    userData: User;
    child: any[];
    profileForm: FormGroup;
    
    private _unsubscribeAll: Subject<any>;

    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _profileSettingService: ProfileSettingService,
        private _modalService: NzModalService,
        private _authService: AuthService,
        private _commonService: CommonService
    ) {
        this.isEditBasic = false;
        this.isLoadingBasicData = false;
        this.isEditContact = false;
        this._unsubscribeAll = new Subject();
        
    }

    ngOnInit() {
        this._profileSettingService.onDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((userData: any) => {
                this._logger.debug("[user-data]", userData);
                this.userData = userData.user;
                this.child = userData.child;
            });
    }

        ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    getStaffProfileImage(item) : string{
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return AppConst.image.PROFILE_CALLBACK;;
    }

}
