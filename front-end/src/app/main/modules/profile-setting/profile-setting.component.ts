import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import {helpMotion} from 'ng-zorro-antd';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ProfileSettingService} from './services/profile-setting.service';
import {User} from '../user/user.model';
import {NGXLogger} from 'ngx-logger';
import {AuthService} from '../../../shared/service/auth.service';

@Component({
  selector: 'profile-setting',
  templateUrl: './profile-setting.component.html',
  styleUrls: ['./profile-setting.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ProfileSettingComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    userData: User;
    child: any[];
    isSiteManager: boolean;

  constructor(
      private _profileSettingService: ProfileSettingService,
      private _logger: NGXLogger,
      private _authService: AuthService
  ) {
      this.isSiteManager = this._authService.isOwner();
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

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

}
