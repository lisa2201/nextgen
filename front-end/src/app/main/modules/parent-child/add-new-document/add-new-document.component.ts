import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { FileListItem } from 'app/shared/components/s3-upload/s3-upload.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { helpMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChildDocumentsService } from '../../child/documents/services/child-documents.service';
import { ParentChildService } from '../service/parent-child.service';

@Component({
  selector: 'app-add-new-document',
  templateUrl: './add-new-document.component.html',
  styleUrls: ['./add-new-document.component.scss'],
  animations: [
    helpMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
]
})
export class AddNewDocumentComponent implements OnInit {

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

    fileUploaded: boolean;

    constructor(
        public matDialogRef: MatDialogRef<AddNewDocumentComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _auth: AuthService,
        private _modalService: NzModalService,
        private _ParentchildService: ParentChildService,
        private _route: ActivatedRoute,
    ) {
        this._unsubscribeAll = new Subject();


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
    }

    ngOnInit(): void {
        this.fileUploaded = false;
        this.uploadFileMap = (this._data.response.currentDocuments) ? this._data.response.currentDocuments : {};
        this.documentDataID = this._data.response.documentId;
        console.log(this._data.response);
        console.log(this.documentDataID);
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
        this._ParentchildService
            .storeDocuments(sendObj)
            .pipe()
            .subscribe(
                message =>
                {
                    this._notification.clearSnackBar();
                    this.matDialogRef.close(message);

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
