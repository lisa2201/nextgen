import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import * as _ from 'lodash';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CommonService } from 'app/shared/service/common.service';
import { MatDialog } from '@angular/material/dialog';
import { ProviderEditAddressComponent } from '../dialogs/provider-edit-address/provider-edit-address.component';
import { ProviderEditFinacialComponent } from '../dialogs/provider-edit-finacial/provider-edit-finacial.component';
import { AppConst } from 'app/shared/AppConst';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { EditContactComponent } from '../dialogs/edit-contact/edit-contact.component';
import { Subject } from 'rxjs';
import { ProviderSetupService } from '../services/provider-setup.service';
import { ProviderSetup} from '../models/provider-setup.model';
import { takeUntil } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { ProviderBusinessNameChangeComponent } from '../dialogs/provider-business-name-change/provider-business-name-change.component';

@Component({
    selector: 'app-view',
    templateUrl: './provider-view.component.html',
    styleUrls: ['./provider-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ProviderViewComponent implements OnInit, OnDestroy {

    provider = null;
    providerList = [];
    dialogRef: any;
    buttonLoader: boolean;
    addressdisabled: boolean;
    tableLoading: boolean;
    apiData: any;
    syncerror: any;
    apiAdressData: any;
    apiNameData = [];
    apiContactData: any;
    apiFinanceData: any;
    providerNameData = [];

    _unsubscribeAll: Subject<any>;
    constructor(
        private _commonService: CommonService,
        public _matDialog: MatDialog,
        private _notification: NotificationService,
        private _route: ActivatedRoute,
        private _location: Location,
        private _providerSetupService: ProviderSetupService,
        private _logger: NGXLogger,
    ) { 
        this.buttonLoader = false;
        this.addressdisabled = false;
        this.tableLoading = false;
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        this.initData();
        console.log('provider list', this.provider);

        this._providerSetupService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {

                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
                // this.searchInput[value ? 'disable' : 'enable']();
            });

    }

    ngOnDestroy(): void {

    }

    initData(): void {
        this.provider = this._route.snapshot.data['resolveData'].providerData;
        this.providerList[0] = this.provider; 
        this.apiData = this._route.snapshot.data['resolveData'].apiData;
        
        if (this.provider.is_synced !== '0' || this.provider.is_synced !== '1'){
            if (!_.isEmpty(this._route.snapshot.data['resolveData'].syncerror.message )){
                this.syncerror = this._route.snapshot.data['resolveData'].syncerror.message;
            }

            else{
                this.syncerror = 'Error occurred.';
            }
        }

        else{
            this.syncerror = null;
        }

        this.apiNameData = [
            {
                provider_id: this.provider.provider_id,
                buisness_name: this.provider.buisness_name,
                legal_name: this.provider.legal_name,
                entity_type: this.provider.entity_type,
                ABN: this.provider.ABN,
                ccs_setup: this.provider?.ccs_setup
            }
        ];

        if (this.provider.is_synced !== '0') {

            const businessName = _.find(this.apiData['ProviderName']['results'], {type: 'BUS'});
            const legalName = _.find(this.apiData['ProviderName']['results'], {type: 'LGL'});

            console.log('------businessName------', businessName);
            console.log('------legalName------', legalName);

            this.providerNameData = [
                {
                    provider_id: this.apiData['providerID'],
                    legal_name: legalName?.name,
                    buisness_name: businessName?.name,
                    entity_type: this.apiData['providerEntityType'],
                    ABN: this.apiData['providerABN'],
                    commencementDate: this.apiData['commencementDate']
                }
            ];
        }

        // this.syncerror = this.provider.is_synced === '2' ? (!_.isEmpty(this._route.snapshot.data['resolveData'].syncerror.message ) ? this._route.snapshot.data['resolveData'].syncerror.message : 'Error occurred.') : '';
        
        this.addressdisabled = this.provider.is_synced === '0' ? true : false;
        console.log('[syncerror]', this.syncerror);


    }

    editAddressDialog(index: string, i: number, isApi: boolean): void {
        this.buttonLoader = true;

        Promise.all([

            this._commonService.getCityStates('AU'),
        ])
            .then(([states]: [any]) => {

                setTimeout(() => this.buttonLoader = false, 200);
                this.dialogRef = this._matDialog
                    .open(ProviderEditAddressComponent,
                        {
                            panelClass: 'provider-address-edit-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                states: states,
                                // providerid: this.provider.id,
                                providerData: this.provider,
                                index: i,
                                address_data: (this.provider.is_synced === '0' || this.provider.is_synced === '2') ? this.provider.address[i] : (this.apiData ? this.apiData['Address']['results'][i] : null),
                                apiData: this.apiData
                                // response: {}
                            }
                        });

                this.dialogRef
                    .afterClosed()
                    .subscribe((obj: { response: string, data: object }) => {

                        if (!obj) {
                            return;
                        }

                        if (obj.data) {
                            console.log('log i', i);
                            console.log('object .data', obj.data);
                            // this.provider.is_synced = '0';
                            // if (this.provider.is_synced === '0' || this.provider.is_synced === '2') {
                            //     this.provider.address[i] = obj.data;
                            // }
                            // else {
                            //     this.apiData['Address']['results'][i] = obj.data;
                            // }

                            // this.provider.address[i] = obj.data;

                            if (isApi) {

                                this.apiData['Address']['results'][i] = obj.data;
                            } else {
                                this.provider.address[i] = obj.data;
                            }
                            
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
                    });
            });

    }


    editfinancialDialog(index: number): void {

        console.log(index);
        this.buttonLoader = true;
        setTimeout(() => this.buttonLoader = false, 200);
        this.dialogRef = this._matDialog
            .open(ProviderEditFinacialComponent,
                {
                    panelClass: 'provider-financial-edit-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        providerid: this.provider.id,
                        index: index,
                        financial_data: this.provider.financial[index],
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
                    this.provider.financial[index] = obj.data;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
            });
    }




    editcontactDialog(index: number): void {

        console.log(index);
        this.dialogRef = this._matDialog
            .open(EditContactComponent,
                {
                    panelClass: 'edit-contact',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        providerid: this.provider.id,
                        index: index,
                        contact_data: this.provider.contact[index],
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
                    this.provider.contact[index] = obj.data;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(obj.response, NotifyType.SUCCESS), 200);
            });
    }

    editBusinessName(item: ProviderSetup): void{
        
        this.dialogRef = this._matDialog
        .open(ProviderBusinessNameChangeComponent,
            {
                panelClass: 'edit-business-name',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalActionTypes.NEW,
                    item: item,
                    providerData: this.provider,
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
                console.log('this.obj.data', obj.data);
                this.provider.is_synced = '0';

                this.apiNameData = obj.data;
                this.providerNameData = obj.data;

                console.log('apiNameData', this.apiNameData[0]);
                console.log('providerNameData', this.providerNameData);
                

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

    getEntityType(data: any): string {

        if (data.entity_type) {

            let entityType = '';

            switch (data.entity_type) {
                case '01':
                    entityType = 'Incorporated Body/Association';
                    break;
                case '02':
                    entityType = 'Indigenous Corporation';
                    break;
                case '03':
                    entityType = 'Sole Trader/Individual';
                    break;
                case '04':
                    entityType = 'Partnership';
                    break;
                case '05':
                    entityType = 'Private Company';
                    break;
                case '06':
                    entityType = 'Public Company';
                    break;
                case '07':
                    entityType = 'Registered Co-operative';
                    break;
                case '08':
                    entityType = 'Australian Government';
                    break;
                case '09':
                    entityType = 'State/Territory Government';
                    break;
                case '10':
                    entityType = 'Local Government';
                    break;
                case '11':
                    entityType = 'Unincorporated Body';
                    break;

                default:
                    entityType = 'N/A';
                    break;
            }
    
            return entityType;

        } else {
            return 'N/A';
        }
        
    }

}
