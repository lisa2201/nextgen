import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { FormArray, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ServicePersonnel } from '../../../model/ServicePersonnel';
import { NGXLogger } from 'ngx-logger';
import { ServicePersonnelViewService } from '../../../service/service-personnel-view-service';
import * as _ from 'lodash';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-add-role-service-personnel',
    templateUrl: './add-role-service-personnel.component.html',
    styleUrls: ['./add-role-service-personnel.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddRoleServicePersonnelComponent implements OnInit {


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
    roles: FormArray;
    roleForm: FormGroup;
    nameForm: FormGroup;
    docForm: FormGroup;
    wwccForm: FormGroup;
    buttonLoader: boolean;
    isNameMode: boolean;
    title: string;
    type: string;

    selectedDoc: any;
    selectedFileType: any;
    selectedFile: any;
    imageSrc: string;

    servicePersonnel: ServicePersonnel;
    private _unsubscribeAll: Subject<any>;
    constructor(
        private _logger: NGXLogger,
        private _servicePersonnelViewService: ServicePersonnelViewService,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<AddRoleServicePersonnelComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();
        this.servicePersonnel = _data.servicePersonnel;
        console.log(this.servicePersonnel);
        console.log(_data);

        this.selectedDoc = [];
        this.selectedFileType = null;
        this.selectedFile = null;

        if (_data.mode === 'NAME') {
            this.type = _data.mode;
            this.isNameMode = true;
            this.title = 'Edit Contact details';
            this.nameForm = this.createNameForm();

        }
        else if (_data.mode === 'WWCC') {
            this.title = 'Add WWCC';
            this.type = _data.mode;
            this.wwccForm = this.createWWCCForm();
        }

        else if (_data.mode === 'DOC') {
            console.log('this is doc mode');
            
            this.title = 'Add Supporting Document';
            this.type = _data.mode;
            this.docForm = this.createDocForm();
        }
        else{
            this.type = 'ROLE';
            this.roleForm = this.createRoleForm();
            this.isNameMode = false;
            this.title = 'Add role';
        }
    }

    ngOnInit(): void {

        this.isNameMode ? this.nameForm = this.createNameForm() : this.roleForm = this.createRoleForm();
    }

    createRoleForm(): FormGroup {
        return new FormGroup({
            roles: new FormArray([this.createRole()]),
        });

    }

    createNameForm(): FormGroup {
        return new FormGroup({
            phone: new FormControl({ value: this.isNameMode ? this.servicePersonnel.phone : '', disabled: false }, [Validators.required]),
            fname: new FormControl({ value: this.isNameMode ? this.servicePersonnel.firstName : '', disabled: true }, [Validators.required]),
            lname: new FormControl({ value: this.isNameMode ? this.servicePersonnel.lastName : '', disabled: true }, [Validators.required]),
        });

    }
    createDocForm(): FormGroup {
        return new FormGroup({
            documentCheck: new FormArray([]),
        });
    }
    
    createWWCCForm(): FormGroup {
        return new FormGroup({
            wwccInput: new FormArray([this.createWWCC()]),
        });
    }
    
    createWWCC(): FormGroup {
        return new FormGroup({
            cardNumber: new FormControl(null, [Validators.required]),
            issuingState: new FormControl(null, [Validators.required]),
            expiryDate: new FormControl(null, [Validators.required]),
        });
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    createRole(): FormGroup {
        return new FormGroup({
            roleDate: new FormControl(),
            roleType: new FormControl(null, []),
            rolePosition: new FormControl(null, []),
        });
    }

    get fc(): any {

        if (this.type === 'NAME') {
            return this.nameForm.controls;
    
        }
        else if (this.type === 'ROLE') {
            return this.roleForm.controls;
        }
        else if (this.type === 'WWCC'){
            return this.wwccForm.controls;
            
        }
        
    }

    onFormSubmitRole(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        console.log(this.roleForm);

        const roleObject = [];

        _.forEach(this.fc.roles.value, (i) => {
            roleObject.push({
                action: '01',
                type: i.roleType,
                position: i.rolePosition,
                startDate: DateTimeHelper.getUtcDate(i.roleDate),
            });
        });
        const sendObj = {
            type: 'NEW_ROLE',
            id: this.servicePersonnel.id,
            roles: roleObject
        };

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        this._servicePersonnelViewService
            .addNew(sendObj)
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

    onFormSubmitDoc(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        const sendObj = {
            type: 'NEW_DOC',
            id: this.servicePersonnel.id,
            supportingDocInput: this.selectedDoc,
        };

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        this._servicePersonnelViewService
            .addNew(sendObj)
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

    onFormSubmitWWCC(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        const wwccObject = [];
        _.forEach(this.fc.wwccInput.value, (i) => {
        wwccObject.push({
            action: '01',
            cardNumber: i.cardNumber,
            expiryDate: DateTimeHelper.getUtcDate(i.expiryDate),
            issuingState: i.issuingState
        });
    });
    
        const sendObj = {
        type: 'NEW_WWCC',
        id: this.servicePersonnel.id,
        wwcc: wwccObject,
    };

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        this._servicePersonnelViewService
            .addNew(sendObj)
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

    onFormSubmitName(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        const sendObj = {
            phone: this.nameForm.get('phone').value,
            id: this.servicePersonnel.id
        };

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        this._servicePersonnelViewService
            .editContact(sendObj)
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
