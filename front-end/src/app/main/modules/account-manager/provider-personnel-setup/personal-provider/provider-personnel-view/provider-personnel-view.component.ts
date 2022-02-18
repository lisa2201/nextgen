import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { ProviderPersonnelViewService } from '../../service/provider-personnel-view-service';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ProviderPersonnel } from '../../model/providerPersonnel';
import { AppConst } from 'app/shared/AppConst';
import { MatDialog } from '@angular/material/dialog';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AddRoleServicePersonnelComponent } from '../../personal-service/dialog/add-role-service-personnel/add-role-service-personnel.component';
import { ProviderPersonnelAddRoleComponent } from './dialog/provider-personnel-add-role/provider-personnel-add-role.component';
import { Location } from '@angular/common';
import { NewProviderPersonnelComponent } from '../../dialog/new-service-personal/new-provider-personnel/new-provider-personnel.component';
import { ServicePersonalService } from '../../service/personal-service';
import { BranchService } from 'app/main/modules/branch/services/branch.service';
import { User } from 'app/main/modules/user/user.model';
import { Branch } from 'app/main/modules/branch/branch.model';
import { ProviderSetup } from '../../../provider-setup/models/provider-setup.model';
@Component({
  selector: 'provider-personnel-view',
  templateUrl: './provider-personnel-view.component.html',
  styleUrls: ['./provider-personnel-view.component.scss'],
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
],
encapsulation: ViewEncapsulation.None
})
export class ProviderPersonnelViewComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    providerPersonnel: ProviderPersonnel;
    syncError: string;
    roleData: any;
    dialogRef: any;
    buttonLoader: boolean;
    declaration = [
        {
            name: 'WWCC',
            help: 'A working with children card check issued by the authority responsible for working with children cards in the State or Territory in relation to care provided by a child care service of the provider.',
            index: 0,
            dbName: 'wwcc'
        },
        {
            name: 'Police Check',
            help: 'An Australian National Policy Criminal History Check obtained from the relevant state or territory police service or an agency accredited by the Australian Criminal Intelligence Commission, and obtained no more than six months previously.',
            index: 1,
            dbName: 'policeCheck'
        },
        {
            name: 'AFSA',
            help: 'A National Personal Insolvency Index check performed using the Bankruptcy Register Search service provided by the Australian Financial Security Authority (AFSA).',
            index: 2,
            dbName: 'AFSA'
        },
        {
            name: 'ASIC',
            help: 'A Current and Historical personal name extract search of the records of the Australian Securities and Investments Commission (ASIC).',
            index: 3,
            dbName: 'ASIC'
        },
        {
            name: 'Adverse Events',
            help: 'Have the above checks revealed any adverse events?',
            index: 4,
            dbName: 'adverseEvents'
        }
    ];

    roleType = [
        {
            name: 'Day to Day operation of the service',
            index: 0,
            value: 'OPERAT',
            dbName: 'day_to_day_operation',
            help: 'Is a person responsible for undertaking the day-to-day operation of the service.'
        },
        {
            name: 'Service Contact',
            value: 'CONTAC',
            index: 1,
            dbName: 'service_contact',
            help: 'Is a person who may discuss family entitlements and transaction processing results with the department.'
        },
    ];

    PositionsList = [
        {
            name: 'Chairperson',
            index: 0,
            dbName: 'chairperson',
            value: 'Z7'
        },
        {
            name: 'Chief Executive Officer',
            index: 1,
            dbName: 'chief_executive_officer',
            value: 'Z8'
        },
        {
            name: 'Child Care Service',
            index: 2,
            dbName: 'child_care_service',
            value: 'Z9'
        },
        {
            name: 'Director Company Director',
            index: 3,
            dbName: 'director_company_director',
            value: 'Z10'
        },
        {
            name: 'Company Financial Officer',
            index: 4,
            dbName: 'company_financial_officer',
            value: 'Z11'

        },
        {
            name: 'Chief Executive Officer',
            index: 5,
            dbName: 'chief_executive_officer',
            value: 'Z14'
        },
        {
            name: 'Company Secretary',
            index: 6,
            dbName: 'company_secretary',
            value: 'Z12'
        },
        {
            name: 'Coordinator',
            index: 7,
            dbName: 'coordinator',
            value: 'Z13'
        },
        {
            name: 'Nominated Supervisor',
            index: 8,
            dbName: 'nominated_supervisor',
            value: 'Z17'
        },
        {
            name: 'Manager',
            index: 9,
            dbName: 'manager',
            value: 'Z16'
        },
        {
            name: 'General Manager',
            index: 10,
            dbName: 'general_manager',
            value: 'Z15'
        },
        {
            name: 'Program Manager',
            index: 11,
            dbName: 'program_manager',
            value: 'Z21'
        },
        {
            name: 'Principal',
            index: 12,
            dbName: 'principal',
            value: 'Z22'
        },
        {
            name: 'President',
            index: 13,
            dbName: 'president',
            value: 'Z19'
        },
        {
            name: 'Operator',
            index: 14,
            dbName: 'operator',
            value: 'Z18'
        },
        {
            name: 'Treasurer',
            index: 15,
            dbName: 'treasurer',
            value: 'Z22'
        },
        {
            name: 'Other',
            index: 16,
            dbName: 'other',
            value: 'Z23'
        },

    ];
  constructor(
    private _router: Router,
    private _providerPersonnelViewService: ProviderPersonnelViewService,
    private _logger: NGXLogger,
    private _notification: NotificationService,
    private _matDialog: MatDialog,
    private _location: Location,
    private _personalService: ServicePersonalService,
    private _branchService: BranchService,
  ) 
  { 
      this._unsubscribeAll = new Subject();
  }

  // tslint:disable-next-line: typedef
  ngOnInit() {

    this._logger.debug('provider personnel edit');

        // Subscribe to branch changes
    this._providerPersonnelViewService
            .onProviderPersonnelChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[providerPersonnel]', response);
                this.providerPersonnel = response.providerPersonnel;

                if ( this.providerPersonnel.isSynced === '2') {
                  this.syncError =   this.providerPersonnel.syncerror['message'] !== '' ? this.providerPersonnel.syncerror['message'] : 'Error occurred';
                }
                else {
                    this.syncError = '';
                }
                this._logger.debug('provider personnel error', this.syncError);
            });

  }

  onBack(e: MouseEvent): void
  {
      e.preventDefault();
      this._location.back();
    //   this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
  }

  trackByFn(index: number, item: any): number {
    return index;
}

addRole(e: MouseEvent, item: ProviderPersonnel): void {

    e.preventDefault();
    this.dialogRef = this._matDialog
        .open(ProviderPersonnelAddRoleComponent,
            {
                panelClass: 'provider-role-new-personal',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalActionTypes.NEW,
                    providerPersonnel: item,
                    mode: 'ROLE'
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
        
    }

    editDialogName(e: MouseEvent, item: ProviderPersonnel): void {
        e.preventDefault();
        this.dialogRef = this._matDialog
        .open(ProviderPersonnelAddRoleComponent,
            {
                panelClass: 'provider-role-new-personal',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalActionTypes.NEW,
                    providerPersonnel: item,
                    mode: 'NAME'
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

    }

    edit(e: MouseEvent, item: ProviderPersonnel): void {
        e.preventDefault();

        this.buttonLoader = true;
        Promise.all([
            this._personalService.getUserData(),
            this._personalService.getBranches(),
            this._branchService.getProviders()
        ])
            .then(([userList, branches, providers]: [User[], Branch[], ProviderSetup[]]) => {
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
                                action: AppConst.modalActionTypes.EDIT,
                                userData: userList,
                                branchData: branches,
                                providerData: providers,
                                providerPersonnel: item,
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

    afterClose(): void {
        console.log('close');
      }

      download(e: MouseEvent, item: any): void {
          e.preventDefault();
          const linkSource = 'data:application/pdf;base64,' + item.fileContent;
          const downloadLink = document.createElement('a');
          const fileName = item.fileName;

          downloadLink.href = linkSource;
          downloadLink.download = fileName;
          downloadLink.click();
    }

    addWWCC(e: MouseEvent, item: ProviderPersonnel): void {

        e.preventDefault();
        this.dialogRef = this._matDialog
            .open(ProviderPersonnelAddRoleComponent,
                {
                    panelClass: 'provider-role-new-personal',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        providerPersonnel: item,
                        mode: 'WWCC'
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

    }

    addDoc(e: MouseEvent, item: ProviderPersonnel): void {

        e.preventDefault();
        this.dialogRef = this._matDialog
            .open(ProviderPersonnelAddRoleComponent,
                {
                    panelClass: 'provider-role-new-personal',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        providerPersonnel: item,
                        mode: 'DOC'
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
            
        }

        
        comeSoon( data: any, e: MouseEvent): void
    {
        e.preventDefault();

        alert('coming soon... 😀 all good.');
    }
}
