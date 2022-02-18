import { Component, OnInit, ViewEncapsulation, Inject, ElementRef, ViewChild } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AddProviderComponent } from '../../../provider-setup/dialogs/add-provider/add-provider.component';
import { NGXLogger } from 'ngx-logger';
import { Subject, of, Observable, Observer, forkJoin } from 'rxjs';
import { FormGroup, Validators, FormControl, FormArray, AbstractControl, AsyncValidatorFn, FormBuilder } from '@angular/forms';
import { valueExists } from 'app/shared/validators/asynValidator';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { CommonService } from 'app/shared/service/common.service';
import { User } from 'app/main/modules/user/user.model';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map, catchError, first } from 'rxjs/operators';
import * as _ from 'lodash';
import { InvitationService } from 'app/main/modules/invitation/services/invitation.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { UploadFilter, UploadFile, NzMessageService } from 'ng-zorro-antd';
import { ProviderSetup } from '../../../provider-setup/models/provider-setup.model';
import { ServiceSetup } from '../../../service-setup/models/service-setup.model';
import { Branch } from 'app/main/modules/branch/branch.model';
import { HttpClient, HttpEventType, HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { ServicePersonalService } from '../../service/personal-service';
import { UploadXHRArgs } from 'ng-zorro-antd/upload';
import { FinancialAdjustmentsLeftSidenavComponent } from 'app/main/modules/finance/financial-adjustments/sidenavs/left/financial-adjustments-left-sidenav/financial-adjustments-left-sidenav.component';
import { formatDate } from '@angular/common';
import { filter } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ServicePersonnel } from '../../model/ServicePersonnel';
import * as isEqual from 'fast-deep-equal';
import { ServicePersonnelViewService } from '../../service/service-personnel-view-service';
@Component({
    selector: 'app-new-service-personal',
    templateUrl: './new-service-personal.component.html',
    styleUrls: ['./new-service-personal.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewServicePersonalComponent implements OnInit {
    @ViewChild('fileUpload') fileUpload: ElementRef; files = [];
    private _unsubscribeAll: Subject<any>;
    personalForm: FormGroup;
    editMode: boolean;
    buttonLoader: boolean;
    users: User[];
    providers: ProviderSetup[];
    services: Branch[];
    selectedServices: any;
    selectedUser: User;
    selectedUsers: User[];
    action: string;
    selectedDoc: any;
    selectedFileType: any;
    selectedFile: any;
    imageSrc: string;
    listOfControl: Array<{ id: number; controlInstance: string }> = [];
    uploadDirectory: any;
    filListSelected: any;

    uploading = false;
    fileList: any[] = [];

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
            dbName: 'OPERAT',
            help: 'Is a person responsible for undertaking the day-to-day operation of the service.'
        },
        {
            name: 'Service Contact',
            value: 'CONTAC',
            index: 1,
            dbName: 'CONTAC',
            help: 'Is a person who may discuss family entitlements and transaction processing results with the department.'
        },
        {
            name: 'Educator',
            value: 'FDCEDU',
            index: 2,
            dbName: 'FDCEDU',
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
    showPRODA: boolean;
    diialogTite: string;
    getActionType: string;
    servicePersonnel: ServicePersonnel;
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<NewServicePersonalComponent>,
        private _commonService: CommonService,
        private _invitationService: InvitationService,
        private formBuilder: FormBuilder,
        private _httpClient: HttpClient,
        private _personalService: ServicePersonalService,
        private msg: NzMessageService,
        private _servicePersonnelViewService: ServicePersonnelViewService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();

        this.users = _data.userData;
        this.action = _data.action;
        this.services = _data.branchData;
        this.providers = _data.providerData;
        
        this.selectedUsers = this.users;
        this._logger.debug('[branchdata]', this.services);
        this._logger.debug('[_data]', _data);
        this._logger.debug('[Action]', this.uploadDirectory);

        this.selectedDoc = [];
        this.selectedFileType = null;
        this.selectedFile = null;


        if (_data.action === AppConst.modalActionTypes.EDIT) {
            this.editMode = true;
            this.diialogTite = 'Edit Service';
            this.servicePersonnel = _data.servicePersonnel;
            this.selectedServices = _.find(this.providers, ['providerId', this.servicePersonnel.providerId]).services;
        }

        else {
            this.editMode = false;
            this.diialogTite = 'New Personnel Service';
            this.selectedServices = [];
        }
        this.editMode ? (this.servicePersonnel.identity === '0') ? this.showPRODA = true : this.showPRODA = false : this.showPRODA = true;


        // this.editMode ?  this.selectedServices = _.find(this.providers, ['providerId', this.servicePersonnel.providerId]).services : this.selectedServices = [];


    }

    // tslint:disable-next-line: typedef
    ngOnInit() {

        this.personalForm = this.createPersonalForm();
        this.setAsyncValidators();
        this.addDocumentCheckbox();
        this.editMode ? this.addDeclarationsCheckboxResult() : this.addDeclarationsCheckbox();
        
        this.editMode ? (this.servicePersonnel.identity === '0') ? this.personalForm.get('identy').patchValue('0', { emitEvent: false }) : this.personalForm.get('identy').patchValue('1', { emitEvent: false }) : this.personalForm.get('identy').patchValue('0', { emitEvent: false });
        this.addSupportingDoc();
        // this.editMode ? this.addDocumentCheckboxResult() : this. addSupportingDoc();

        // tslint:disable-next-line: no-unused-expression
        if (this.editMode) {
            this.createRoleResult();
        }

        if (this.editMode) {
            this.createWWCCResult();
        }



        console.log(this.personalForm);
        this.change();

    }

    change(): void {
        this.personalForm
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
                    this.personalForm.reset();
                }
            });

        this.personalForm
            .get('branch')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[branch value change]', value);

                if (!_.isNull(value)) {

                    this.selectedUsers = [];
                    this.selectedUsers = this.users.filter(i => i.branch.id === value);


                    if (this.selectedUsers.length < 0) {

                        this.personalForm.get('branch').patchValue(null, { emitEvent: false });
                    }
                }

                else {
                    this.selectedUsers = this.users;
                }
            });

        this.personalForm
            .get('provider')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[provider value change]', value);

                if (!_.isNull(value)) {

                    //  this.providers.filter(i => i.id === value);
                    //  this.selectedServices = this.providers.services;
                    this.selectedServices = [];

                    const group = _.find(this.providers, ['providerId', value]);
                    // console.log('group', group);
                    // this.selectedServices = group.services;



                    if (group && _.keys(group.services).length > 0) {
                        this.selectedServices = _.map(group.services);
                    }
                    else {
                        this.personalForm.get('service').patchValue(null, { emitEvent: false });
                    }
                }
                else {
                    this.selectedServices = [];
                }

                this._logger.debug('[selectedServices]', this.selectedServices);

            });

        this.personalForm
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
        this.servicePersonnel.personnelDeclaration.forEach((v: any, i: number) => {
            const control = new FormControl(v.value, []);
            (this.fc.declaration as FormArray).push(control);
        });
    }

    addDocumentCheckboxResult(): void {
        this.servicePersonnel.supportingDocuments.forEach((v: any, i: number) => {
            const control = new FormControl(v.value, []);
            (this.fc.documentCheck as FormArray).push(control);
        });
    }

    validateArrangementType(value: any): void {
        setTimeout(() => {
            if (value === '1') {
                this.personalForm.get('personId').setValidators([Validators.required]);
                // this.personalForm.get('prodaId').setValidators([]);
            } else if (value === '0') {
                this.personalForm.get('prodaId').setValidators([Validators.required]);
                // this.personalForm.get('personId').setValidators([]);
            }
        }, 50);
    }

    changeFile(e: any): void {
        console.log('changefile', e);
        this.filListSelected = e;
        // const formData = new FormData();
        // formData.append('file', this.selectedFile); 
        // formData.append('id', '1000');
        // this.filListSelected.push({
        //     file: e
        // });
        console.log('filListSelected', this.filListSelected);


    }

    beforeUpload = (file: UploadFile): boolean => {
        this.fileList = this.fileList.concat(file);
        return false;
    }

    handleUpload(): void {
        const formData = new FormData();
        console.log('handleUpload request work');
        // tslint:disable-next-line:no-any
        // this.fileList.forEach((file: any) => {
        //   formData.append('files[]', file);
        // });
        formData.append('file', this.fileList[0]);

        this.uploading = true;
        console.log('fileList', this.fileList);
        // You can use any AJAX library you like
        const req = new HttpRequest
            ('POST', `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/personal-service-data-submit`, formData, {
                reportProgress: true
            });
        // const req = new HttpRequest('POST', 'https://jsonplaceholder.typicode.com/posts/', formData, {
        //   reportProgress: true
        // });
        this._httpClient
            .request(req)
            .pipe(filter(e => e instanceof HttpResponse))
            .subscribe(
                () => {
                    this.uploading = false;
                    this.fileList = [];
                    this.msg.success('upload successfully.');
                },
                () => {
                    this.uploading = false;
                    this.msg.error('upload failed.');
                }
            );
    }

    customReq = (item: UploadXHRArgs) => {
        console.log('custom request work');
        console.log('item', item);
        // Create a FormData here to store files and other parameters.
        const formData = new FormData();
        // tslint:disable-next-line:no-any
        formData.append('file', item as any);
        formData.append('id', '1000');
        console.log('formdata', formData);

        // const req = new HttpRequest('POST', this.uploadDirectory, formData, {
        //   reportProgress: true,
        //   withCredentials: true
        // });
        // Always returns a `Subscription` object. nz-upload would automatically unsubscribe it at correct time.
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/personal-service-data-submit`, formData)
            .subscribe((event: HttpEvent<any>) => {
                if (event.type === HttpEventType.UploadProgress) {
                    if (event.total! > 0) {
                        (event as any).percent = (event.loaded / event.total!) * 100;
                    }
                    item.onProgress!(event, item.file!);
                } else if (event instanceof HttpResponse) {
                    item.onSuccess!(event.body, item.file!, event);
                }
            },
                err => {
                    item.onError!(err, item.file!);
                }
            );



        // return this._httpClient.request(req).subscribe(

        //   (event: HttpEvent<any>) => {
        //     if (event.type === HttpEventType.UploadProgress) {
        //       if (event.total! > 0) {
        //         (event as any).percent = (event.loaded / event.total!) * 100;
        //       }
        //       item.onProgress!(event, item.file!);
        //     } else if (event instanceof HttpResponse) {
        //       item.onSuccess!(event.body, item.file!, event);
        //     }
        //   },
        //   err => {
        //     item.onError!(err, item.file!);
        //   }
        // );
    }




    // A simple sliced upload.
    customBigReq = (item: UploadXHRArgs) => {
        const size = item.file.size;
        const chunkSize = parseInt(size / 3 + '', 10);
        const maxChunk = Math.ceil(size / chunkSize);
        const reqs = Array(maxChunk)
            .fill(0)
            // tslint:disable-next-line: no-shadowed-variable
            .map((_: {}, index: number) => {
                const start = index * chunkSize;
                let end = start + chunkSize;
                if (size - end < 0) {
                    end = size;
                }
                const formData = new FormData();
                formData.append('file', item.file.slice(start, end));
                formData.append('start', start.toString());
                formData.append('end', end.toString());
                formData.append('index', index.toString());
                const req = new HttpRequest('POST', item.action!, formData, {
                    withCredentials: true
                });
                return this._httpClient.request(req);
            });

        return forkJoin([...reqs]).subscribe(
            () => {
                // tslint:disable-next-line: deprecation
                item.onSuccess!({}, item.file!, event);
            },
            err => {
                item.onError!(err, item.file!);
            }
        );
    }

    createPersonalForm(): FormGroup {
        return new FormGroup({
            fName: new FormControl(this.editMode ? this.servicePersonnel.firstName : '', [Validators.required]),
            lName: new FormControl(this.editMode ? this.servicePersonnel.lastName : '', [Validators.required]),
            // mName: new FormControl('', [Validators.required]),
            email: new FormControl(this.editMode ? this.servicePersonnel.email : '', [Validators.email, Validators.required]),
            phone: new FormControl(this.editMode ? this.servicePersonnel.phone : ''),
            dob: new FormControl(this.editMode ? this.servicePersonnel.dob : '', [Validators.required]),
            identy: new FormControl(this.editMode ? this.servicePersonnel.identity : '', [Validators.required]),
            prodaId: new FormControl(this.editMode ? (this.servicePersonnel.identity === '0') ? this.servicePersonnel.prodaId : '' : ''),
            personId: new FormControl(this.editMode ? (this.servicePersonnel.identity === '1') ? this.servicePersonnel.prodaId : '' : ''),
            declaration: new FormArray([]),
            roles: new FormArray(this.editMode ? [] : [this.createRole()]),
            assignUser: new FormControl(this.editMode ? this.servicePersonnel.userIndex : null),
            branch: new FormControl(this.editMode ? this.servicePersonnel.branchIndex : null),
            wwccInput: new FormArray(this.editMode ? [] : [this.createWWCC()]),
            supportingDocInput: new FormArray([]),
            provider: new FormControl(this.editMode ? this.servicePersonnel.providerId : null, [Validators.required]),
            service: new FormControl(this.editMode ? this.servicePersonnel.serviceId : null, [Validators.required]),
            documentCheck: new FormArray([]),
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

        this.roles = this.personalForm.get('roles') as FormArray;

        this.servicePersonnel.roles.forEach((v: any, i: number) => {
            this.roles.push(
                new FormGroup({
                    roleDate: new FormControl(v.startDate),
                    roleType: new FormControl(v.type, []),
                    rolePosition: new FormControl(v.position, []),
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

    createWWCCResult(): void {

        this.wwccInput = this.personalForm.get('wwccInput') as FormArray;

        this.servicePersonnel.wwcc.forEach((v: any, i: number) => {
            this.wwccInput.push(
                new FormGroup({
                    cardNumber: new FormControl(v.cardNumber),
                    issuingState: new FormControl(v.issuingState),
                    expiryDate: new FormControl(v.expiryDate),
                })
            );
        });

    }

    addRole(): void {
        this.roles = this.personalForm.get('roles') as FormArray;
        this.roles.push(this.createRole());
    }

    addWWCC(): void {
        this.wwccInput = this.personalForm.get('wwccInput') as FormArray;
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
            const control = new FormControl(this.editMode ? this.servicePersonnel.personnelDeclaration[v.value] : false, []);
            (this.fc.declaration as FormArray).push(control);
        });
    }

    addDocumentCheckbox(): void {
        this.supportingDoc.forEach((v: any, i: number) => {
            const control = new FormControl(this.editMode ? this.servicePersonnel.supportingDocuments[v.value] : false, []);
            (this.fc.documentCheck as FormArray).push(control);
        });
    }

    addRoleSelectkbox(): void {
        this.roleSelect.forEach((v: any, i: number) => {
            // const control = new FormControl(null);
            // (this.fc.roleSelect as FormArray).push(control);
        });
    }

    addSupportingDoc(): void {
        this.supportingDoc.forEach((v: any, i: number) => {
            const control = new FormControl([]);
            (this.fc.supportingDocInput as FormArray).push(control);
        });
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    get fc(): any {
        return this.personalForm.controls;
    }

    addField(e?: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }
        const id = this.listOfControl.length > 0 ? this.listOfControl[this.listOfControl.length - 1].id + 1 : 0;

        const control = {
            id,
            controlInstance: `passenger${id}`
        };
        const index = this.listOfControl.push(control);
        console.log(this.listOfControl[this.listOfControl.length - 1]);
        this.personalForm.addControl(
            this.listOfControl[index - 1].controlInstance,
            new FormControl(null, Validators.required)
        );
        // const control = new FormControl(false);
        // (this.fc.role as FormArray).push(control);
    }

    removeField(i: { id: number; controlInstance: string }, e: MouseEvent): void {
        e.preventDefault();
        if (this.listOfControl.length > 1) {
            const index = this.listOfControl.indexOf(i);
            this.listOfControl.splice(index, 1);
            console.log(this.listOfControl);
            this.personalForm.removeControl(i.controlInstance);
        }
    }

    setSelectedUserValue(item: any): void {

        this.selectedUser = this.users.find(user => user.id === item);
        console.log(this.selectedUser);
        try {
            this.personalForm.get('fName').setValue(this.selectedUser.firstName);
            this.personalForm.get('lName').setValue(this.selectedUser.lastName);
            // this.personalForm.get('mName').setValue(`${this.selectedUser.}.kinderm8.com.au`);
            this.personalForm.get('email').setValue(this.selectedUser.email);
            this.personalForm.get('phone').setValue(this.selectedUser.phoneNumber);
            this.personalForm.get('dob').setValue(this.selectedUser.dob);

        }
        catch (err) {
            console.log(err);
        }
    }

    setAsyncValidators(): void {
        setTimeout(() => {
            this.personalForm.get('email').setAsyncValidators([this.emailExistsValidator(this.editMode ? '' : '')]);
        }, 500);
    }

    emailExistsValidator(id: string): AsyncValidatorFn {
        return (control: AbstractControl) => control
            .valueChanges
            .pipe(
                debounceTime(800),
                distinctUntilChanged(),
                switchMap(() => this._invitationService.emailExists(control.value, this.selectedUser.id)),
                map((unique: boolean) => (!unique ? null : { 'exists': true })),
                catchError(() => of({ 'exists': true })),
                first()
            );
    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    onFormSubmit(e: MouseEvent): void {
        this._logger.debug('[personal submit]');
        e.preventDefault();

        console.log(this.personalForm);

        if (this.editMode) {
            if (this.servicePersonnel.isSynced !== '2' && this.servicePersonnel.isSynced !== '0') {
                this.getActionType = '02';
            }

            // else{
            //     this.getActionType = '02';
            // }
        }

        // else{
        //     this.getActionType = '01';
        // }


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
        });
        console.log('declaration last object', declaration_object);

        const roleObject = [];

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
       


        // const b64 = btoa('guru');
        // console.log('base64', b64);

        //     const pdf2base64 = require('pdf-to-base64');
        //     pdf2base64('http://www.africau.edu/images/default/sample.pdf')
        // .then(
        //     (response) => {
        //         console.log(response); 
        //     }
        // )
        // .catch(
        //     (error) => {
        //         console.log(error); 
        //     }
        // );

        const service = _.find(this.selectedServices, {serviceid: this.fc.service.value});

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
            service: this.fc.service.value,
            provider: this.fc.provider.value,
            assignUser: this.fc.assignUser.value,
            supportingDocInput: this.selectedDoc,  // SupportingDocuments, // this.fc.supportingDocInput.value,
            roles: roleObject,
            wwcc: wwccObject, // this.fc.wwccInput.value,
            userId: this.fc.assignUser.value,
            branch: this.fc.branch.value,
            service_setup_id: service.id
            // docCheck: document_checkbox_object
        };

        if (this.editMode) { sendObj['id'] = this.servicePersonnel.id; }

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;
        if (this.editMode) {

            this._servicePersonnelViewService
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

            this._personalService
            .storePersonnel(sendObj)
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

    // onFileSelected(event): void {
    //     console.log('onchange');

    //     this.selectedFile = event.target.file[0];
    //     this.onUpload();
    // }

    // tslint:disable-next-line: typedef
    // onUpload(){
    //     const formData = new FormData();
    //     formData.append('image', this.selectedFile);
    //     this._httpClient.post(this.uploadDirectory, formData)
    //     .subscribe(res => {
    //         console.log('success');

    //     });
    // }

    // tslint:disable-next-line: typedef
    uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file.data);
        file.inProgress = true;
        this._personalService.upload(formData).pipe(
            map(event => {
                switch (event.type) {
                    case HttpEventType.UploadProgress:
                        file.progress = Math.round(event.loaded * 100 / event.total);
                        break;
                    case HttpEventType.Response:
                        return event;
                }
            }),
            catchError((error: HttpErrorResponse) => {
                file.inProgress = false;
                return of(`${file.data.name} upload failed.`);
            })).subscribe((event: any) => {
                if (typeof (event) === 'object') {
                    console.log(event.body);
                }
            });
    }

    // tslint:disable-next-line: typedef
    private uploadFiles() {
        this.fileUpload.nativeElement.value = '';
        this.files.forEach(file => {
            this.uploadFile(file);
        });
    }

    // tslint:disable-next-line: typedef
    onClick() {
        const fileUpload = this.fileUpload.nativeElement; fileUpload.onchange = () => {
            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < fileUpload.files.length; index++) {
                const file = fileUpload.files[index];
                this.files.push({ data: file, inProgress: false, progress: 0 });
            }
            this.uploadFiles();
        };
        fileUpload.click();
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
