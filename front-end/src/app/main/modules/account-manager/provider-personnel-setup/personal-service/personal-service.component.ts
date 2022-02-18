import { Component, OnInit } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NewServicePersonalComponent } from '../dialog/new-service-personal/new-service-personal.component';
import { UsersService } from 'app/main/modules/user/services/users.service';
import { ServicePersonalService } from '../service/personal-service';
import { User } from 'app/main/modules/user/user.model';
import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';
import { BranchService } from 'app/main/modules/branch/services/branch.service';
import { Branch } from 'app/main/modules/branch/branch.model';
import { ServicePersonnel } from '../model/ServicePersonnel';
import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'personal-service',
    templateUrl: './personal-service.component.html',
    styleUrls: ['./personal-service.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PersonalServiceComponent implements OnInit {

    personalService: ServicePersonnel[];
    dialogRef: any;
    buttonLoader: boolean;
    private _unsubscribeAll: Subject<any>;


    constructor(
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _personalService: ServicePersonalService,
        private _branchService: BranchService,
        private _logger: NGXLogger,
    ) {
        this.personalService = [];
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        this._personalService
            .onservicePersonnelChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((servicePersonnelList: ServicePersonnel[]) => 
            {
                this._logger.debug('[servicePersonnelList]', servicePersonnelList);

                this.personalService = servicePersonnelList;
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
                .open(NewServicePersonalComponent,
                    {
                        panelClass: 'service-new-personal',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.NEW,
                            userData: userList,
                            branchData: branches,
                            providerData: providers
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
