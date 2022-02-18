import {Component, Inject, OnInit, TemplateRef} from '@angular/core';
import {Subject} from 'rxjs';
import {FormArray, FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NGXLogger} from 'ngx-logger';
import {NotificationService} from '../../../../../shared/service/notification.service';
import {CommonService} from '../../../../../shared/service/common.service';
import {AuthService} from '../../../../../shared/service/auth.service';
import {AppConst} from '../../../../../shared/AppConst';
import {differenceInCalendarDays, endOfWeek, format, startOfWeek, subDays} from 'date-fns';
import {helpMotion, NzModalRef, NzModalService} from 'ng-zorro-antd';
import {fuseAnimations} from '../../../../../../@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {finalize, takeUntil} from 'rxjs/operators';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {promise} from 'selenium-webdriver';
import {FileListItem} from '../../../../../shared/components/s3-upload/s3-upload.model';
import * as _ from 'lodash';
import {ChildDocumentsService} from '../services/child-documents.service';
import {ActivatedRoute} from '@angular/router';

@Component({
    selector: 'child-add-new-document',
    templateUrl: './child-add-new-document.component.html',
    styleUrls: ['./child-add-new-document.component.scss'],
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildAddNewDocumentComponent implements OnInit {
    action: string;
    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    documentForm: FormGroup;
    confirmModal: NzModalRef;


    uploadTypes: string;
    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    uploadFileMapTemp: object;
    documentDataID: string;
    documents: any[];
    documentsData: any[];
    documentTypes: any[];
    selectedDoc: any;
    isFromHealth: boolean;

    fileUploaded: boolean;

    constructor(
        public matDialogRef: MatDialogRef<ChildAddNewDocumentComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _auth: AuthService,
        private _modalService: NzModalService,
        private _documentsService: ChildDocumentsService,
        private _route: ActivatedRoute,
    ) {

        console.log(_data);
        
        this._unsubscribeAll = new Subject();

        this.isFromHealth = _data.response.isFromHealth;

        this.dialogTitle = 'Add New Document';
        this.uploadFileMap = {};
        this.uploadFileMapTemp = {};
        this.uploadTypes = 'image/*, application/pdf';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.CHILD_Profile;
        this.documents = null;
        this.documentsData=[];
        this.selectedDoc = null;

        this.fileUploaded = false;

        this.documentTypes =
            [
                {name: 'Health Record' , value: 'healthRecord' },
                {name: 'Medicare immunisation record' , value: 'childImmunised' },
                {name: 'Regular Prescribed Medicine' , value: 'prescribedMedicine' },
                {name: 'Anaphylaxis Action Plan' , value: 'anaphylaxis' },
                {name: 'Health Conditions' , value: 'healthConditions' },
                {name: 'Asthma Action Plan' , value: 'asthma' },
                {name: 'Court Appointed Orders' , value: 'courtAppointed' },
                {name: 'Birth Certificate' , value: 'birthCertificate' },
                {name: 'Epipen or Anipen?' , value: 'epipenOrAnipen' },
            ];

            if(this.isFromHealth){

                this.documentTypes = this.documentTypes.filter(v=> v.value === _data.response.value);

                this.documents = _data.response.document.documents;
                this.documentDataID = _data.response.document.id;
                if(_data.response.document.documents && !Array.isArray(_data.response.document.documents))
                    this.uploadFileMap = _data.response.document.documents;
                    this.createDocumentArray();
                
            }
    }

    ngOnInit(): void {
        this.fileUploaded = false;


        if(!this.isFromHealth){

            this._documentsService
            .onDocumentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                console.log(' response.documents', response.documents);
                
                this.documents = response.documents;
                this.documentDataID = response.id;
                if(response.documents && !Array.isArray(response.documents))
                    this.uploadFileMap = response.documents;
                this.createDocumentArray();
            });

        }
    }

    createDocumentArray(): void
    {
        this.documentsData = [];
        for(const item in this.documents)
        {
            const obj = {};
            obj['name'] = item;
            obj['fileurl'] = this.documents[item];
            this.documentsData.push(obj);
        }
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {

        // this.uploadFileMap[inputName] = _.map(fileList, 'key');
        // console.log(_.map(fileList, 'key'));
        this.uploadFileMapTemp[inputName] = _.map(fileList, 'key');
        /*if(this.uploadFileMap[inputName])
        {
            console.log('the array index already has a file');
            if(!this.uploadFileMap[inputName].indexOf(_.map(fileList, 'key')))
            {
                console.log('cool. this file is not already in array. inserting it!');
                this.uploadFileMap[inputName] = this.uploadFileMap[inputName].concat(_.map(fileList, 'key'));
            }
        }
        else
        {
            console.log('the array index does not exist');
            this.uploadFileMap[inputName] = _.map(fileList, 'key');
        }*/
        this.fileUploaded = true;
        /*console.log('fileUploaded ',this.fileUploaded);
        console.log('selectedDoc ',this.selectedDoc);*/

        console.log(this.uploadFileMapTemp[inputName]);
    }




    submitDocument(e: MouseEvent): void {
        e.preventDefault();
        this.fileUploaded = false;

        if(this.uploadFileMap[this.selectedDoc])
        {
            this.uploadFileMap[this.selectedDoc] = this.uploadFileMap[this.selectedDoc].concat(this.uploadFileMapTemp[this.selectedDoc]);
        }
        else
            this.uploadFileMap[this.selectedDoc] = this.uploadFileMapTemp[this.selectedDoc];

        const sendObj = {
            documentID: this.documentDataID,
            childId: this._data.response.childId,
            upload_files: this.uploadFileMap
        };


        console.log(sendObj);
        console.log(this.uploadFileMap);

        this._documentsService
            .storeDocuments(sendObj)
            .pipe()
            .subscribe(
                message =>
                {
                    this._notification.clearSnackBar();
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    this.matDialogRef.close(message);
                    return message;

                },
                error =>
                {

                    throw error;
                },

            );

    }



    resetForm(): void{

    }

}
