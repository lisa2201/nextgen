import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ProviderSetupService } from './services/provider-setup.service';

import {  AddProviderComponent } from './dialogs/add-provider/add-provider.component';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import * as _ from 'lodash';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountManagerService } from '../account-manager.service';


@Component({
    selector: 'app-provider-setup',
    templateUrl: './provider-setup.component.html',
    styleUrls: ['./provider-setup.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ],
    encapsulation: ViewEncapsulation.None
})
export class ProviderSetupComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    providers = [];
    dialogRef: any;
    buttonLoader: boolean;


    constructor(
        private _providerService: ProviderSetupService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _accountManagerService: AccountManagerService
    ) {

        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {


        this._providerService.onProviderChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {
                console.log('providers list', response);
                
                this.providers = response;
            });

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    addDialog(e: MouseEvent): void {

        e.preventDefault();

        forkJoin([
            this._accountManagerService.getCcsSetups()
        ])
        .subscribe(([ccsSetups]) => {

            this.dialogRef = this._matDialog
                .open(AddProviderComponent,
                    {
                        panelClass: 'add-provider-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.NEW,
                            ccsSetups: ccsSetups,
                            response: {}
                        }
                    });
    
            this.dialogRef
                .afterClosed()
                .subscribe(message => {
                    if (!message) {
                        return;
                    }
    
                    this._notification.clearSnackBar();
    
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
    
                    this._providerService.getProviders()
                    .subscribe(
                        (response: any) => {
                            this._providerService.providers = response;
                            this._providerService.onProviderChanged.next([...response]);
                        }
                    );
                });

        });


    }




}








