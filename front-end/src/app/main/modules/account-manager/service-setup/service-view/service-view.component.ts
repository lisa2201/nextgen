import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import * as _ from 'lodash';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CommonService } from 'app/shared/service/common.service';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ServiceSetupEditAddressComponent } from '../dialogs/service-setup-edit-address/service-setup-edit-address.component';
import { ServiceSetupEditContactComponent } from '../dialogs/service-setup-edit-contact/service-setup-edit-contact.component';
import { ServiceSetupEditFinancialComponent } from '../dialogs/service-setup-edit-financial/service-setup-edit-financial.component';
import { ServiceSetupEditNameComponent } from '../dialogs/service-setup-edit-name/service-setup-edit-name.component';
import { AccsPercentageComponent } from '../dialogs/accs-percentage/accs-percentage.component';


@Component({
    selector: 'app-service-view',
    templateUrl: './service-view.component.html',
    styleUrls: ['./service-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ServiceViewComponent implements OnInit, OnDestroy {

    service = null;
    dialogRef: any;
    apiData: any;
    isShowApiData: boolean;
    syncerror: any;

    constructor(

        private _commonService: CommonService,
        public _matDialog: MatDialog,
        private _notification: NotificationService,
        private _route: ActivatedRoute,
        private _location: Location
    ) { }

    ngOnInit(): void {
        this.initData();

    }


    ngOnDestroy(): void {

    }

    initData(): void {
        this.service = this._route.snapshot.data['resolveData'].data;
        this.apiData = this._route.snapshot.data['resolveData'].apiData;

        this.isShowApiData = this.service.is_synced === '1' ? true : false;
        console.log(this.apiData);

        if (this.service.is_synced !== '0' || this.service.is_synced !== '1'){

          const data  =  JSON.parse(this.service.syncerror);

          if (!_.isEmpty(data) && !_.isEmpty(data.message)){
                this.syncerror = data.message;
            }

            else{
                this.syncerror = 'Error occurred.';
            }
        }

        else{
            this.syncerror = null;
        }

        console.log(this.syncerror);
        
        
    }


    editAddressDialog(index: number, isApi: boolean): void {


        Promise.all([
            this._commonService.getCityStates('AU')
        ])
            .then(([states]: [any]) => {


                this.dialogRef = this._matDialog
                    .open(ServiceSetupEditAddressComponent,
                        {
                            panelClass: 'service-setup-address-edit-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                states: states,
                                serviceid: this.service.id,
                                index: index,
                                serviceData: this.service,
                                address_data: this.service.is_synced === '2' ? this.service.address[index] : this.service.is_synced === '0' ? this.service.address[index] :  this.apiData['Address']['results'][index],
                                response: {}
                            }
                        });

                this.dialogRef
                    .afterClosed()
                    .subscribe((obj: { response: string, data: object }) => {

                        if (!obj) {
                            return;
                        }

                        if (obj.data) {
                            // this.service.is_synced = '0';
                            // this.service.address[index] = obj.data;
                            // this.apiData['Address']['results'][index] = obj.data;
                            if (isApi) {

                                this.apiData['Address']['results'][index] = obj.data;
                            } else {
                                this.service.address[index] = obj.data;
                            }
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
                    });
            });

    }

    editcontactDialog(index: number): void {

        console.log(index);
        this.dialogRef = this._matDialog
            .open(ServiceSetupEditContactComponent,
                {
                    panelClass: 'edit-contact',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        serviceid: this.service.id,
                        index: index,
                        contact_data: this.service.contact[index],
                        response: {}
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((obj: { response: string, data: object }) => {

                if (!obj) {
                    return;
                }

                if (obj.data) {
                    this.service.contact[index] = obj.data;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
            });
    }
    editfinancialDialog(index: number): void {

        console.log(index);
        this.dialogRef = this._matDialog
            .open(ServiceSetupEditFinancialComponent,
                {
                    panelClass: 'service-setup-financial-edit-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        serviceid: this.service.id,
                        index: index,
                        financial_data: this.service.financial[index],
                        response: {}
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((obj: { response: string, data: object }) => {

                if (!obj) {
                    return;
                }

                if (obj.data) {
                    this.service.financial[index] = obj.data;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
            });
    }

    apiservice(e: MouseEvent): void {

        this.dialogRef = this._matDialog
            .open(AccsPercentageComponent,
                {
                    panelClass: 'accs-view',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        serviceid: this.service.id
                    }
                });

        // this.dialogRef
        //     .afterClosed()
        //     .subscribe((obj: { response: string, data: any }) => {

        //         if (!obj) {
        //             return;
        //         }

        //         if (obj.data) {
        //             console.log('obj.data', obj.data);
        //             this.service.is_synced = '0';
        //             this.apiData = obj.data;
        //             // this.service.contact[index] = obj.data;
        //         }

        //         this._notification.clearSnackBar();

        //         setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
        //     });

    }

    editName(e: MouseEvent, name: any): void {

        this.dialogRef = this._matDialog
            .open(ServiceSetupEditNameComponent,
                {
                    panelClass: 'edit-name',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        nameData: name,
                        serviceData: this.service,
                        apiData: this.apiData
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((obj: { response: string, data: any }) => {

                if (!obj) {
                    return;
                }

                if (obj.data) {
                    console.log('obj.data', obj.data);
                    this.service.is_synced = '0';
                    this.apiData = obj.data;
                    // this.service.contact[index] = obj.data;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
            });

    }


    goBack(): void {
        this._location.back();
    }

    afterClose(): void {
        console.log('close');
      }

}


