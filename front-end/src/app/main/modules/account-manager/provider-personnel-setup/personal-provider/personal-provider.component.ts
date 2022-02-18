import { Component, OnInit } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { ServicePersonalService } from '../service/personal-service';
import { BranchService } from 'app/main/modules/branch/services/branch.service';
import { NGXLogger } from 'ngx-logger';
import { User } from 'app/main/modules/user/user.model';
import { Branch } from 'app/main/modules/branch/branch.model';
import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';
import { NewServicePersonalComponent } from '../dialog/new-service-personal/new-service-personal.component';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs';
import { NewProviderPersonnelComponent } from '../dialog/new-service-personal/new-provider-personnel/new-provider-personnel.component';
import { ProviderPersonalService } from '../service/provider-personnel-service';
import { ProviderPersonnel } from '../model/providerPersonnel';

@Component({
  selector: 'personal-provider',
  templateUrl: './personal-provider.component.html',
  styleUrls: ['./personal-provider.component.scss'],
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
]
})
export class PersonalProviderComponent implements OnInit {
    dialogRef: any;
    buttonLoader: boolean;
    providerPersonnel: ProviderPersonnel[];
    private _unsubscribeAll: Subject<any>;
  constructor(
    private _matDialog: MatDialog,
    private _notification: NotificationService,
    private _personalService: ServicePersonalService,
    private _personalProvider: ProviderPersonalService,
    private _branchService: BranchService,
    private _logger: NGXLogger,
  ) 
  { 
        this.providerPersonnel = [];
        this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {

    this._personalProvider
    .onProviderPersonnelChanged
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((personalProvider: ProviderPersonnel[]) => 
    {
        this._logger.debug('[personalProvider]', personalProvider);

        this.providerPersonnel = personalProvider;
    });
  }

  addDialog(e: MouseEvent): void {
    e.preventDefault();

    this.buttonLoader = true;
    Promise.all([
       this._personalService.getUserData(),
       this._personalService.getBranches(),
       this._branchService.getProviders()
    ])
    .then(([userList, branches, providers]: [User[], Branch[], ProviderSetup[]]) => 
    {
        console.log('branch create modal', branches);
        
        setTimeout(() => this.buttonLoader = false, 200);
        this.dialogRef = this._matDialog
            .open(NewProviderPersonnelComponent,
                {
                    panelClass: 'provider-new-personal',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        userData: userList,
                        branchData: branches,
                        providerData: providers,
                        mode: 'PROVIDER'
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message => {
                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    });



}

}
