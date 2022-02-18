import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CareProvidedVacancyComponent } from './care-provided-vacancy.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSidebarModule } from '@fuse/components';

import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { browserRefresh } from 'app/app.component';
import { NzFormModule, NzSelectModule, NzSpinModule, NzCardModule, NzListModule, NzEmptyModule, NzSkeletonModule, NzButtonModule, NzIconModule, NzInputModule, NzDropDownModule, NzDividerModule, NzSwitchModule, NzTableModule, NzPaginationModule, NzAvatarModule, NzBadgeModule, NzModalModule, NzTimePickerModule } from 'ng-zorro-antd';
import { TooltipModule } from 'ng2-tooltip-directive';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { CareProvidedVacancyService } from './services/care-provided-vacancy.service';
import { NzAlertModule } from 'ng-zorro-antd/alert';

const routes = [
  {
      path: '',
      component: CareProvidedVacancyComponent,
      resolve:
      {
          resolveData: CareProvidedVacancyService
      }
   
  },  
];

@NgModule({
  declarations: [CareProvidedVacancyComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TranslateModule,
    FuseSharedModule,
    KM8SharedModule,
    FuseSidebarModule,
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
    NzAvatarModule,
    NzBadgeModule,
    NzModalModule,
    TooltipModule,
    InfiniteScrollModule,
    NzTimePickerModule,
    RyTimePickerModule,
    NzDatePickerModule,
    NzAlertModule
  ]
})
export class CareProvidedVacancyModule { }
