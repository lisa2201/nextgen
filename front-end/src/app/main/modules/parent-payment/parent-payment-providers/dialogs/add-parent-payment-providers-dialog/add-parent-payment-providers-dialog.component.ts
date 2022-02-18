import { Component, OnInit, OnDestroy, ViewEncapsulation, Inject, ViewChild } from '@angular/core';
import { helpMotion, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { ParentPaymentProvidersService } from '../../services/parent-payment-providers.service';
import { NGXLogger } from 'ngx-logger';
import { Branch } from 'app/main/modules/branch/branch.model';
import { takeUntil, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { ParentPaymentProvider } from '../../parent-payment-provider.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { KeyValidationDialogComponent } from '../key-validation-dialog/key-validation-dialog.component';

interface ProviderMaster {
    type: string;
    display_name: string;
    config: ConfigurationArray[];
    country: string;
}

interface ConfigurationArray {
    name: string;
    description: string;
    value: string | null;
}

@Component({
    selector: 'app-add-parent-payment-providers-dialog',
    templateUrl: './add-parent-payment-providers-dialog.component.html',
    styleUrls: ['./add-parent-payment-providers-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class AddParentPaymentProvidersDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    paymentProvider: ParentPaymentProvider | null;
    paymentProviderForm: FormGroup;
    buttonLoading: boolean;
    providerMaster: ProviderMaster[];
    providerList: ProviderMaster[];
    branchList: Branch[];
    dialogTitle: string;
    configArrayItems: any[];
    editMode: boolean;
    dialogRef: any;

    constructor(
        public matDialogRef: MatDialogRef<AddParentPaymentProvidersDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _parentPaymentProvidersService: ParentPaymentProvidersService,
        private _logger: NGXLogger,
        private _nzModalService: NzModalService,
        private _matDialog: MatDialog
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.configArrayItems = [];

        this.branchList = this._data.branches ? this._data.branches : [];
        this.paymentProvider = this._data.provider ? this._data.provider : null;
        this.editMode = this._data.action === AppConst.modalActionTypes.EDIT ? true : false;

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.initializeMaster();
        this.createForm();

        if (this.editMode) {
            this.dialogTitle = 'Edit Provider';
            this.setupEditData();
            this._logger.debug('[Initial provider master data]', this.providerMaster);
        } else {
            this.dialogTitle = 'Add Provider';
        }


        this.paymentProviderForm.get('branch')
            .valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {
                this.branchChangeHandler(value);
            });

    }


    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create form
     */
    createForm(): void {

        this.paymentProviderForm = this._formBuilder.group({
            branch: new FormControl(null, [Validators.required]),
            provider: new FormControl(null, [Validators.required]),
            configArray: new FormArray([]),
            status: new FormControl(true)
        });

        this.paymentProviderForm.get('provider').valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value: string) => {

                this.typeChangeHandler(value);

            });

        if (this.editMode) {
            {
                this.paymentProviderForm.get('branch').disable();
                setTimeout(() => {
                    this.paymentProviderForm.get('provider').patchValue(this.paymentProvider.paymentType);
                }, 100);
            }
        }

    }

    initializeMaster(): void {

        this.providerMaster = [
            // {
            //     type: 'stripe',
            //     display_name: 'Stripe',
            //     config: [
            //         {
            //             name: 'public_key',
            //             description: 'Public Key',
            //             value: null
            //         },
            //         {
            //             name: 'secret_key',
            //             description: 'Secret Key',
            //             value: null
            //         }
            //     ],
            //     country: 'ALL'
            // },
            {
                type: 'ezidebit',
                display_name: 'Ezidebit',
                config: [
                    {
                        name: 'public_key',
                        description: 'Public Key',
                        value: null
                    },
                    {
                        name: 'digital_key',
                        description: 'Digital Key',
                        value: null
                    }
                ],
                country: 'AU'
            }
        ];

    }

    branchChangeHandler(value: any): void {

        const typeControl = this.paymentProviderForm.get('provider');

        typeControl.reset();

        if (value) {

            const branch = _.find(this.branchList, { id: value });

            if (branch.country === 'AU') {
                this.providerList = _.filter(this.providerMaster, { country: 'AU' });
            } else {
                this.providerList = _.filter(this.providerMaster, { country: 'ALL' });
            }

        }

    }

    setupEditData(): void {
        const index = this.getProviderIndex(this.paymentProvider.paymentType);
        _.merge(this.providerMaster[index].config, this.paymentProvider.configuration);

        if (this.paymentProvider?.branch?.country === 'AU') {
            this.providerList = _.filter(this.providerMaster, { country: 'AU' });
        } else {
            this.providerList = _.filter(this.providerMaster, { country: 'ALL' });
        }

        this.paymentProviderForm.patchValue({
            status: this.paymentProvider.status,
            provider: this.paymentProvider.paymentType
        });

    }

    get fc(): any {
        return this.paymentProviderForm.controls;
    }

    get configArray(): FormArray {
        return this.paymentProviderForm.get('configArray') as FormArray;
    }

    getProviderIndex(value: string): number {
        return _.findIndex(this.providerMaster, { 'type': value });
    }

    typeChangeHandler(value: string): void {

        this.clearConfigArray();

        if (value) {
            const index = this.getProviderIndex(value);
            this.configArrayItems = [...this.providerMaster[index].config];
            this.addConfigControls();
        }

    }

    addConfigControls(): void {

        for (const item of this.configArrayItems) {
            this.configArray.push(new FormControl(item.value, [Validators.required]));
        }

    }

    clearConfigArray(): void {
        this.configArray.clear();
    }

    onSubmit(): void {

        const index = this.getProviderIndex(this.fc.provider.value);

        this.validateKeys(index);

    }

    validateKeys(index: number): void {

        let sendObj = {};

        if (this.editMode) {

            sendObj = {
                provider_id: this.paymentProvider.id,
                payment_type: this.fc.provider.value,
                configuration: _.map(this.providerMaster[index].config, (val: any, idx: number) => {
                    return { ...val, ...{ value: this.configArray.controls[idx].value } };
                }),
                status: this.fc.status.value === true ? '0' : '1'
            };

        } else {
            
            sendObj = {
                payment_type: this.fc.provider.value,
                branch: this.fc.branch.value,
                configuration: _.map(this.providerMaster[index].config, (val: any, idx: number) => {
                    return { ...val, ...{ value: this.configArray.controls[idx].value } };
                }),
                status: this.fc.status.value === true ? '0' : '1'
            };

        }


        this.buttonLoading = true;

        this._parentPaymentProvidersService.validateKeys(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                if (response.data && _.isArray(response.data) && response.data.length > 0) {

                    this.dialogRef = this._matDialog
                        .open(KeyValidationDialogComponent,
                            {
                                panelClass: 'key-validation-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    providers: response.data,
                                    response: {}
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .subscribe((accept: boolean) => {

                            if (accept) {
                                this.handleSubmit(index);
                            }

                        });

                } else {
                    this.handleSubmit(index);
                }

            });

    }

    handleSubmit(index: number): void {

        if (this.editMode) { 
            this.editProvider(index);
        } else {
            this.addProvider(index);
        }

    }

    addProvider(index: number): void {

        const sendObj = {
            payment_type: this.fc.provider.value,
            branch: this.fc.branch.value,
            configuration: _.map(this.providerMaster[index].config, (val: any, idx: number) => {
                return { ...val, ...{ value: this.configArray.controls[idx].value } };
            }),
            status: this.fc.status.value === true ? '0' : '1'
        };

        this._logger.debug('[add_provider_send_obj]', sendObj);

        this.buttonLoading = true;

        this._parentPaymentProvidersService.addProvider(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {
                setTimeout(() => this.matDialogRef.close(response), 250);
            });

    }

    editProvider(index: number): void {

        const sendObj = {
            provider_id: this.paymentProvider.id,
            payment_type: this.fc.provider.value,
            configuration: _.map(this.providerMaster[index].config, (val: any, idx: number) => {
                return { ...val, ...{ value: this.configArray.controls[idx].value } };
            }),
            status: this.fc.status.value === true ? '0' : '1'
        };

        this._logger.debug('[edit_provider_send_obj]', sendObj);

        this.buttonLoading = true;

        this._parentPaymentProvidersService.updateProvider(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {
                setTimeout(() => this.matDialogRef.close(response), 250);
            });

    }

}
