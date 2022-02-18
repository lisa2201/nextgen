import { Component, OnInit, Inject, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonService } from 'app/shared/service/common.service';
import { InvitationService } from 'app/main/modules/invitation/services/invitation.service';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl, AsyncValidatorFn, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ServicePersonalService } from '../../../service/personal-service';
import { NzMessageService } from 'ng-zorro-antd';
import { Subject, of } from 'rxjs';
import { User } from 'app/main/modules/user/user.model';
import { ProviderSetup } from 'app/main/modules/account-manager/provider-setup/models/provider-setup.model';
import { Branch } from 'app/main/modules/branch/branch.model';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map, catchError, first } from 'rxjs/operators';
import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ProviderPersonalService } from '../../../service/provider-personnel-service';
import { ProviderPersonnel } from '../../../model/providerPersonnel';
import { AppConst } from 'app/shared/AppConst';
import { ProviderPersonnelViewService } from '../../../service/provider-personnel-view-service';

@Component({
    selector: 'app-new-provider-personnel',
    templateUrl: './new-provider-personnel.component.html',
    styleUrls: ['./new-provider-personnel.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewProviderPersonnelComponent implements OnInit {

    @ViewChild('fileUpload') fileUpload: ElementRef; files = [];
    private _unsubscribeAll: Subject<any>;
    providerPersonneleForm: FormGroup;
    editMode: boolean;
    buttonLoader: boolean;
    users: User[];
    providers: ProviderSetup[];
    services: Branch[];
    selectedUser: User;
    selectedUsers: User[];
    selectedDoc: any;
    selectedFileType: any;
    selectedFile: any;
    imageSrc: string;
    action: string;
    listOfControl: Array<{ id: number; controlInstance: string }> = [];
    uploadDirectory: any;
    filListSelected: any;

    uploading = false;
    fileList: any[] = [];
    getActionType: string;

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
            name: 'Provider Management or Control',
            index: 0,
            value: 'MANCON',
            dbName: 'day_to_day_operation',
            help: 'Is a person responsible for undertaking the day-to-day operation of the service.'
        },
        // {
        //     name: 'Service Contact',
        //     value: 'CONTAC',
        //     index: 1,
        //     dbName: 'service_contact',
        //     help: 'Is a person who may discuss family entitlements and transaction processing results with the department.'
        // },
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
            name: 'Child Care Service Director',
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
            value: 'Z20'
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

    roleSelect = [
        {
            index: 0
        }
    ];

    wwcc = [
        {
            index: 0
        }
    ];

    IssuingStateList = [
        {
            name: 'New South Wales',
            index: 0,
            value: 'NSW',
        },
        {
            name: 'Australian Capital Territory',
            index: 1,
            value: 'ACT',
        },
        {
            name: 'Western Australia',
            index: 2,
            value: 'WA',
        },
        {
            name: 'Queensland',
            index: 3,
            value: 'QLD',
        },
        {
            name: 'Victoria',
            index: 4,
            value: 'VIC',
        },
        {
            name: 'Tasmania',
            index: 5,
            value: 'TAS',
        },
        {
            name: 'Northern Territory',
            index: 6,
            value: 'NT',
        },
        {
            name: 'South Australia',
            index: 7,
            value: 'SA',
        },
    ];

    roleTypeHelp = 'Day to Day operation of the service:  Is a person responsible for undertaking the day-to-day operation of the service. Service Contact: Is a person who may discuss family entitlements and transaction processing results with the department.';

    supportingDoc = [
        {
            name: 'Police criminal history check',
            index: 0,
            value: 'AM0018',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'Letter patent (personnel)',
            index: 1,
            value: 'AM0006',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'National personal insolvency index',
            index: 2,
            value: 'AM0019',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'Current and historical personal name extract',
            index: 3,
            value: 'AM0020',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'CCS related document for personnel',
            index: 4,
            value: 'AM0030',
            progress: 0,
            showBar: false,
            message: '',
        }
    ];



    orderForm: FormGroup;
    items: FormArray;
    roles: FormArray;
    wwccInput: FormArray;
    providerPersonnel: ProviderPersonnel;
    showPRODA: boolean;
    diialogTite: string;
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<NewProviderPersonnelComponent>,
        private _commonService: CommonService,
        private _invitationService: InvitationService,
        private formBuilder: FormBuilder,
        private _httpClient: HttpClient,
        private _personalService: ServicePersonalService,
        private msg: NzMessageService,
        private _personalProvider: ProviderPersonalService,
        private _providerPersonnelViewService: ProviderPersonnelViewService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();

        this.users = _data.userData;
        this.action = _data.action;
        this.services = _data.branchData;
        this.providers = _data.providerData;
        this.selectedUsers = this.users;
        this.uploadDirectory = this._personalService.uploadDirectory;
        this._logger.debug('[branchdata]', this.services);
        this._logger.debug('[_data]', _data);
        this._logger.debug('[Action]', this.uploadDirectory);
        this.selectedDoc = [];
        this.selectedFileType = null;
        this.selectedFile = null;

        if (_data.action === AppConst.modalActionTypes.EDIT) {
            this.editMode = true;
            this.diialogTite = 'Edit Provider';
            this.providerPersonnel = _data.providerPersonnel;
            // this.selectedServices = _.find(this.providers, ['providerId', this.servicePersonnel.providerId]).services;
        }

        else {
            this.editMode = false;
            this.diialogTite = 'New Provider Personnel';
            // this.selectedServices = [];
        }

        this.editMode ? (this.providerPersonnel.identity === '0') ? this.showPRODA = true : this.showPRODA = false : this.showPRODA = true;
    }

    ngOnInit() {

        this.providerPersonneleForm = this.createPersonalForm();
        this.setAsyncValidators();
        this.addDocumentCheckbox();
        this.editMode ? this.addDeclarationsCheckboxResult() : this.addDeclarationsCheckbox();

        this.editMode ? (this.providerPersonnel.identity === '0') ? this.providerPersonneleForm.get('identy').patchValue('0', { emitEvent: false }) : this.providerPersonneleForm.get('identy').patchValue('1', { emitEvent: false }) : this.providerPersonneleForm.get('identy').patchValue('0', { emitEvent: false });
        // this.editMode ? (this.providerPersonnel.identity === '0') ? this.providerPersonneleForm.get('identy').patchValue('0', { emitEvent: false }) : this.providerPersonneleForm.get('identy').patchValue('0', { emitEvent: false });
        // this.addRoleSelectkbox();
        this.addSupportingDoc();
        // this.editMode ? this.addDocumentCheckboxResult() : this. addSupportingDoc();
        console.log(this.providerPersonneleForm);

        if (this.editMode) {
            this.createRoleResult();
        }

        if (this.editMode) {
            this.createWWCCResult();
        }


        this.change();
    }

    change(): void {
        this.providerPersonneleForm
            .get('assignUser')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[user value change]', value);

                if (!_.isNull(value)) {
                    this.setSelectedUserValue(value);
                }
                if (value === null) {
                    this.selectedUser = null;
                    this.providerPersonneleForm.reset();
                }
            });

        this.providerPersonneleForm
            .get('branch')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[branch value change]', value);

                if (!_.isNull(value)) {

                    this.selectedUsers = [];
                    this.selectedUsers = this.users.filter(i => i.branch.id === value);


                    if (this.selectedUsers.length < 0) {

                        this.providerPersonneleForm.get('branch').patchValue(null, { emitEvent: false });
                    }

                }

                else {
                    this.selectedUsers = this.users;
                }
            });

        this.providerPersonneleForm
            .get('identy')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[identy value change]', value);

                if (!_.isNull(value)) {

                    // this.validateArrangementType(value);
                    this.showPRODA = value === '0' ? true : false;
                }
            });
    }

    addDeclarationsCheckboxResult(): void {
        this.providerPersonnel.personnelDeclaration.forEach((v: any, i: number) => {
            const control = new FormControl(v.value, []);
            (this.fc.declaration as FormArray).push(control);
        });
    }

    createPersonalForm(): FormGroup {
        return new FormGroup({
            fName: new FormControl(this.editMode ? this.providerPersonnel.firstName : '', [Validators.required]),
            lName: new FormControl(this.editMode ? this.providerPersonnel.lastName : '', [Validators.required]),
            // mName: new FormControl('', [Validators.required]),
            email: new FormControl(this.editMode ? this.providerPersonnel.email : '', [Validators.email, Validators.required]),
            phone: new FormControl(this.editMode ? this.providerPersonnel.phone : ''),
            dob: new FormControl(this.editMode ? this.providerPersonnel.dob : '', [Validators.required]),
            identy: new FormControl(this.editMode ? this.providerPersonnel.identity : '', [Validators.required]),
            prodaId: new FormControl(this.editMode ? (this.providerPersonnel.identity === '0') ? this.providerPersonnel.prodaId : '' : ''),
            personId: new FormControl(this.editMode ? (this.providerPersonnel.identity === '1') ? this.providerPersonnel.prodaId : '' : ''),
            declaration: new FormArray([]),
            roles: new FormArray(this.editMode ? [] : [this.createRole()]),
            assignUser: new FormControl(this.editMode ? this.providerPersonnel.userIndex : null),
            branch: new FormControl(this.editMode ? '' : null),
            wwccInput: new FormArray(this.editMode ? [] : [this.createWWCC()]),
            supportingDocInput: new FormArray([]),
            provider: new FormControl(this.editMode ? this.providerPersonnel.providerId : null, [Validators.required]),
            documentCheck: new FormArray([]),

            // service: new FormControl(this.editMode ? this.servicePersonnel.serviceId : null, [Validators.required])

            // fName: new FormControl('', [Validators.required]),
            // lName: new FormControl('', [Validators.required]),
            // email: new FormControl('', [Validators.email, Validators.required]),
            // phone: new FormControl(''),
            // dob: new FormControl('', [Validators.required]),
            // identy: new FormControl('', [Validators.required]),
            // prodaId: new FormControl(''),
            // personId: new FormControl(''),
            // declaration: new FormArray([]),
            // roles: new FormArray([this.createRole()]),
            // assignUser: new FormControl(null),
            // branch: new FormControl(null),
            // wwccInput: new FormArray([this.createWWCC()]),
            // supportingDocInput: new FormArray([]),
            // provider: new FormControl(null, [Validators.required]),
        });
    }

    validateArrangementType(value: any): void {
        setTimeout(() => {
            if (value === '1') {
                this.providerPersonneleForm.get('personId').setValidators([Validators.required]);
                // this.personalForm.get('prodaId').setValidators([]);
            } else if (value === '0') {
                this.providerPersonneleForm.get('prodaId').setValidators([Validators.required]);
                // this.personalForm.get('personId').setValidators([]);
            }
        }, 50);
    }

    addDocumentCheckbox(): void {
        this.supportingDoc.forEach((v: any, i: number) => {
            const control = new FormControl(this.editMode ? this.providerPersonnel.supportingDocuments[v.value] : false, []);
            (this.fc.documentCheck as FormArray).push(control);
        });
    }

    createRole(): FormGroup {
        return new FormGroup({
            roleDate: new FormControl(),
            roleType: new FormControl(null, []),
            rolePosition: new FormControl(null, []),
        });
    }

    createRoleResult(): void {

        this.roles = this.providerPersonneleForm.get('roles') as FormArray;

        this.providerPersonnel.roles.forEach((v: any, i: number) => {
            this.roles.push(
                new FormGroup({
                    roleDate: new FormControl(v.startDate),
                    roleType: new FormControl(v.type, []),
                    rolePosition: new FormControl(v.position, []),
                })
            );
        });

    }

    createWWCCResult(): void {

        this.wwccInput = this.providerPersonneleForm.get('wwccInput') as FormArray;

        this.providerPersonnel.wwcc.forEach((v: any, i: number) => {
            this.wwccInput.push(
                new FormGroup({
                    cardNumber: new FormControl(v.cardNumber),
                    issuingState: new FormControl(v.issuingState),
                    expiryDate: new FormControl(v.expiryDate),
                })
            );
        });

    }

    createWWCC(): FormGroup {
        return new FormGroup({
            cardNumber: new FormControl(null, []),
            issuingState: new FormControl(null, []),
            expiryDate: new FormControl(null),
        });
    }

    addRole(): void {
        this.roles = this.providerPersonneleForm.get('roles') as FormArray;
        this.roles.push(this.createRole());
    }

    addWWCC(): void {
        this.wwccInput = this.providerPersonneleForm.get('wwccInput') as FormArray;
        this.wwccInput.push(this.createWWCC());
    }

    deleteRole(e: MouseEvent, index: number): void {
        this.roles.removeAt(index);
    }

    deleteWWCC(e: MouseEvent, i: number): void {

        this.wwccInput.removeAt(i);
    }

    addDeclarationsCheckbox(): void {
        this.declaration.forEach((v: any, i: number) => {
            const control = new FormControl(false);
            (this.fc.declaration as FormArray).push(control);
        });
    }

    addSupportingDoc(): void {
        this.supportingDoc.forEach((v: any, i: number) => {
            const control = new FormControl(null);
            (this.fc.supportingDocInput as FormArray).push(control);
        });
    }

    addDocumentCheckboxResult(): void {
        this.providerPersonnel.supportingDocuments.forEach((v: any, i: number) => {
            const control = new FormControl(v.value, []);
            (this.fc.documentCheck as FormArray).push(control);
        });
    }


    setSelectedUserValue(item: any): void {

        this.selectedUser = this.users.find(user => user.id === item);
        console.log(this.selectedUser);
        try {
            this.providerPersonneleForm.get('fName').setValue(this.selectedUser.firstName);
            this.providerPersonneleForm.get('lName').setValue(this.selectedUser.lastName);
            // this.providerPersonneleForm.get('mName').setValue(`${this.selectedUser.}.kinderm8.com.au`);
            this.providerPersonneleForm.get('email').setValue(this.selectedUser.email);
            this.providerPersonneleForm.get('phone').setValue(this.selectedUser.phoneNumber);
            this.providerPersonneleForm.get('dob').setValue(this.selectedUser.dob);

        }
        catch (err) {
            console.log(err);
        }
    }

    setAsyncValidators(): void {
        setTimeout(() => {
            this.providerPersonneleForm.get('email').setAsyncValidators([this.emailExistsValidator(this.editMode ? '' : '')]);
        }, 500);
    }

    emailExistsValidator(id: string = ''): AsyncValidatorFn {
        return (control: AbstractControl) => control
            .valueChanges
            .pipe(
                debounceTime(800),
                distinctUntilChanged(),
                switchMap(() => this._invitationService.emailExists(control.value, id)),
                map((unique: boolean) => (!unique ? null : { 'exists': true })),
                catchError(() => of({ 'exists': true })),
                first()
            );
    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }


    trackByFn(index: number, item: any): number {
        return index;
    }

    get fc(): any {
        return this.providerPersonneleForm.controls;
    }


    onFormSubmit(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        console.log(this.providerPersonneleForm);

        // tslint:disable-next-line: variable-name
        const document_checkbox_object = [];

        _.forEach(this.fc.documentCheck.value, (v, i) => {
            document_checkbox_object.push({
                index: i,
                value: this.fc.documentCheck.value[i],
                documentType: this.supportingDoc[i]['value'],
                fileName: '',
                MIMEType: 'pdf',
                fileContent: '',
            });
        });

        console.log('documentCheck', document_checkbox_object);

        // tslint:disable-next-line: variable-name
        const declaration_object = [];

        _.forEach(this.fc.declaration.value, (v, i) => {
            declaration_object.push({
                index: i,
                item: this.declaration[i]['dbName'],
                value: this.fc.declaration.value[i]
            });
            // declaration_object[this.declaration[i]['dbName']] = v;
        });

        const roleObject = [];

        if (this.editMode) {
            if (this.providerPersonnel.isSynced !== '2' && this.providerPersonnel.isSynced !== '0') {
                this.getActionType = '02';
            }

            // else{
            //     this.getActionType = '02';
            // }
        }

        // else{
        //     this.getActionType = '01';
        // }
        

        if (this.editMode) {
            _.forEach(this.fc.roles.value, (i) => {
                roleObject.push({
                    action: this.getActionType,
                    type: i.roleType,
                    position: i.rolePosition,
                    startDate: DateTimeHelper.getUtcDate(i.roleDate),
                });
            });
        }
        else{
            _.forEach(this.fc.roles.value, (i) => {
                roleObject.push({
                    type: i.roleType,
                    position: i.rolePosition,
                    startDate: DateTimeHelper.getUtcDate(i.roleDate),
                });
            });
        }
        console.log('role', roleObject);

        const SupportingDocuments = [];

        _.forEach(this.supportingDoc, (i) => {

            SupportingDocuments.push({
                documentType: i.value,
                fileName: 'test' + i.value,
                MIMEType: 'pdf',
                // tslint:disable-next-line: max-line-length
                fileContent: 'JVBERi0xLjMNCiXi48/TDQoNCjEgMCBvYmoNCjw8DQovVHlwZSAvQ2F0YWxvZw0KL091dGxpbmVzIDIgMCBSDQovUGFnZXMgMyAwIFINCj4+DQplbmRvYmoNCg0KMiAwIG9iag0KPDwNCi9UeXBlIC9PdXRsaW5lcw0KL0NvdW50IDANCj4+DQplbmRvYmoNCg0KMyAwIG9iag0KPDwNCi9UeXBlIC9QYWdlcw0KL0NvdW50IDINCi9LaWRzIFsgNCAwIFIgNiAwIFIgXSANCj4+DQplbmRvYmoNCg0KNCAwIG9iag0KPDwNCi9UeXBlIC9QYWdlDQovUGFyZW50IDMgMCBSDQovUmVzb3VyY2VzIDw8DQovRm9udCA8PA0KL0YxIDkgMCBSIA0KPj4NCi9Qcm9jU2V0IDggMCBSDQo+Pg0KL01lZGlhQm94IFswIDAgNjEyLjAwMDAgNzkyLjAwMDBdDQovQ29udGVudHMgNSAwIFINCj4+DQplbmRvYmoNCg0KNSAwIG9iag0KPDwgL0xlbmd0aCAxMDc0ID4+DQpzdHJlYW0NCjIgSg0KQlQNCjAgMCAwIHJnDQovRjEgMDAyNyBUZg0KNTcuMzc1MCA3MjIuMjgwMCBUZA0KKCBBIFNpbXBsZSBQREYgRmlsZSApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY4OC42MDgwIFRkDQooIFRoaXMgaXMgYSBzbWFsbCBkZW1vbnN0cmF0aW9uIC5wZGYgZmlsZSAtICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNjY0LjcwNDAgVGQNCigganVzdCBmb3IgdXNlIGluIHRoZSBWaXJ0dWFsIE1lY2hhbmljcyB0dXRvcmlhbHMuIE1vcmUgdGV4dC4gQW5kIG1vcmUgKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA2NTIuNzUyMCBUZA0KKCB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDYyOC44NDgwIFRkDQooIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNjE2Ljg5NjAgVGQNCiggdGV4dC4gQW5kIG1vcmUgdGV4dC4gQm9yaW5nLCB6enp6ei4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNjA0Ljk0NDAgVGQNCiggbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDU5Mi45OTIwIFRkDQooIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNTY5LjA4ODAgVGQNCiggQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA1NTcuMTM2MCBUZA0KKCB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBFdmVuIG1vcmUuIENvbnRpbnVlZCBvbiBwYWdlIDIgLi4uKSBUag0KRVQNCmVuZHN0cmVhbQ0KZW5kb2JqDQoNCjYgMCBvYmoNCjw8DQovVHlwZSAvUGFnZQ0KL1BhcmVudCAzIDAgUg0KL1Jlc291cmNlcyA8PA0KL0ZvbnQgPDwNCi9GMSA5IDAgUiANCj4+DQovUHJvY1NldCA4IDAgUg0KPj4NCi9NZWRpYUJveCBbMCAwIDYxMi4wMDAwIDc5Mi4wMDAwXQ0KL0NvbnRlbnRzIDcgMCBSDQo+Pg0KZW5kb2JqDQoNCjcgMCBvYmoNCjw8IC9MZW5ndGggNjc2ID4+DQpzdHJlYW0NCjIgSg0KQlQNCjAgMCAwIHJnDQovRjEgMDAyNyBUZg0KNTcuMzc1MCA3MjIuMjgwMCBUZA0KKCBTaW1wbGUgUERGIEZpbGUgMiApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY4OC42MDgwIFRkDQooIC4uLmNvbnRpbnVlZCBmcm9tIHBhZ2UgMS4gWWV0IG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA2NzYuNjU2MCBUZA0KKCBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY2NC43MDQwIFRkDQooIHRleHQuIE9oLCBob3cgYm9yaW5nIHR5cGluZyB0aGlzIHN0dWZmLiBCdXQgbm90IGFzIGJvcmluZyBhcyB3YXRjaGluZyApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY1Mi43NTIwIFRkDQooIHBhaW50IGRyeS4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA2NDAuODAwMCBUZA0KKCBCb3JpbmcuICBNb3JlLCBhIGxpdHRsZSBtb3JlIHRleHQuIFRoZSBlbmQsIGFuZCBqdXN0IGFzIHdlbGwuICkgVGoNCkVUDQplbmRzdHJlYW0NCmVuZG9iag0KDQo4IDAgb2JqDQpbL1BERiAvVGV4dF0NCmVuZG9iag0KDQo5IDAgb2JqDQo8PA0KL1R5cGUgL0ZvbnQNCi9TdWJ0eXBlIC9UeXBlMQ0KL05hbWUgL0YxDQovQmFzZUZvbnQgL0hlbHZldGljYQ0KL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcNCj4+DQplbmRvYmoNCg0KMTAgMCBvYmoNCjw8DQovQ3JlYXRvciAoUmF2ZSBcKGh0dHA6Ly93d3cubmV2cm9uYS5jb20vcmF2ZVwpKQ0KL1Byb2R1Y2VyIChOZXZyb25hIERlc2lnbnMpDQovQ3JlYXRpb25EYXRlIChEOjIwMDYwMzAxMDcyODI2KQ0KPj4NCmVuZG9iag0KDQp4cmVmDQowIDExDQowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDAwMTkgMDAwMDAgbg0KMDAwMDAwMDA5MyAwMDAwMCBuDQowMDAwMDAwMTQ3IDAwMDAwIG4NCjAwMDAwMDAyMjIgMDAwMDAgbg0KMDAwMDAwMDM5MCAwMDAwMCBuDQowMDAwMDAxNTIyIDAwMDAwIG4NCjAwMDAwMDE2OTAgMDAwMDAgbg0KMDAwMDAwMjQyMyAwMDAwMCBuDQowMDAwMDAyNDU2IDAwMDAwIG4NCjAwMDAwMDI1NzQgMDAwMDAgbg0KDQp0cmFpbGVyDQo8PA0KL1NpemUgMTENCi9Sb290IDEgMCBSDQovSW5mbyAxMCAwIFINCj4+DQoNCnN0YXJ0eHJlZg0KMjcxNA0KJSVFT0YNCg=='
            });
        });

        const wwccObject = [];

        if (this.editMode){
            _.forEach(this.fc.wwccInput.value, (i) => {
                wwccObject.push({
                    action: this.getActionType,
                    cardNumber: i.cardNumber,
                    expiryDate: DateTimeHelper.getUtcDate(i.expiryDate),
                    issuingState: i.issuingState
                });
            });
        }
        else{
            _.forEach(this.fc.wwccInput.value, (i) => {
                wwccObject.push({
                    cardNumber: i.cardNumber,
                    expiryDate: DateTimeHelper.getUtcDate(i.expiryDate),
                    issuingState: i.issuingState
                });
            });
        }
        
        const providerSetup = _.find(this.providers, {providerId: this.fc.provider.value});

        const sendObj = {
            fName: this.fc.fName.value,
            email: this.fc.email.value,
            lName: this.fc.lName.value,
            dob: DateTimeHelper.getUtcDate(this.fc.dob.value),
            phone: this.fc.phone.value,
            identy: this.fc.identy.value,
            personId: this.fc.personId.value,
            prodaId: this.fc.prodaId.value,
            declaration: declaration_object,
            // service: this.fc.service.value,
            provider: this.fc.provider.value,
            assignUser: this.fc.assignUser.value,
            supportingDocInput: this.selectedDoc, // SupportingDocuments, // this.fc.supportingDocInput.value,
            roles: roleObject,
            wwcc: wwccObject, // this.fc.wwccInput.value,
            userId: this.fc.assignUser.value,
            provider_setup_id: providerSetup.id
            // docCheck: this.selectedDoc // document_checkbox_object
        };

        if (this.editMode) { sendObj['id'] = this.providerPersonnel.id; }

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        if (this.editMode) {

            this._providerPersonnelViewService
                .updatePersonnel(sendObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    res => {
                        this.buttonLoader = false;

                        setTimeout(() => this.matDialogRef.close(res), 250);
                    },
                    error => {
                        this.buttonLoader = false;

                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }

        else {

            this._personalProvider
                .storePersonnelProvider(sendObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    res => {
                        this.buttonLoader = false;

                        setTimeout(() => this.matDialogRef.close(res), 250);
                    },
                    error => {
                        this.buttonLoader = false;

                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );


        }



    }

    handleInputChange(e, item: any): void {
        this.selectedFileType = item;

        const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        this.selectedFile = file;
        console.log('this is uploaded file', file.name, file.size, file.type);
        const pattern = /.pdf*/;
        this.selectedFileType.showBar = true;
        this.selectedFileType.progress = 5;
        const reader = new FileReader();
        if (!file.type.match(pattern)) {
            alert('invalid format');
            return;
        }
        reader.onload = this._handleReaderLoaded.bind(this);
        const filename = reader.readAsDataURL(file);


    }
    _handleReaderLoaded(e): any {
        console.log(e);

        this.selectedFileType.progress = 50;
        const reader = e.target;
        this.imageSrc = reader.result;
        const newstr = this.imageSrc.replace('data:application/pdf;base64,', '');
        // console.log(newstr);
        const found = this.selectedDoc.find(element => element.documentType === this.selectedFileType.value);
        if (found) {
            const index: number = this.selectedDoc.indexOf(found);
            console.log(index);
            // this.selectedDoc.removeAt(index);
            this.selectedDoc[index] = {
                documentType: this.selectedFileType.value, // 'this doc type',
                fileName: this.selectedFile.name, // 'this file name', // 
                MIMEType: this.selectedFile.type.replace('application/', ''), // 'this file type', // this.selectedFile.type,
                fileContent: newstr,
            };
            setTimeout(() => this.selectedFileType.progress = 100, 500);
            console.log(this.selectedDoc);
            return this.selectedFileType.message === 'File alredy exist';
        }

        this.selectedDoc.push({
            documentType: this.selectedFileType.value, // 'this doc type',
            fileName: this.selectedFile.name.replace('.pdf', ''), // 'this file name', // 
            MIMEType: this.selectedFile.type.replace('application/', ''), // 'this file type', // this.selectedFile.type,
            fileContent: newstr,
        });

        setTimeout(() => this.selectedFileType.progress = 100, 500);

        console.log(this.selectedDoc);



    }

    // uploadFileToActivity(): void {
    //     this.progress = 60;
    //     this._personalService.postFile(this.imageSrc).subscribe(data => {
    //         this.progress = 100;
    //     }, error => {
    //         console.log(error);
    //     });
    // }

    romoveFile(item: any): void {
        console.log('remove work');
        const found = this.selectedDoc.find(element => element.documentType === item.value);
        const index: number = this.selectedDoc.indexOf(found);
        console.log(index);

        if (index !== -1) {
            this.selectedDoc.splice(index, 1);
            this.resetDefault(item);
            console.log(this.selectedDoc);

        }
    }

    resetDefault(item: any): void {
        item.showBar = false;
        item.progress = 0;
    }

}
