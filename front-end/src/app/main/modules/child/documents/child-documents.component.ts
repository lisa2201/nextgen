import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { AppConst } from 'app/shared/AppConst';
import {takeUntil, debounceTime, distinctUntilChanged, finalize} from 'rxjs/operators';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs';
import {FormControl, FormGroup, FormControlName, FormBuilder, Validators} from '@angular/forms';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import {ChildDocumentsService} from './services/child-documents.service';
import {FileListItem} from '../../../../shared/components/s3-upload/s3-upload.model';
import {element} from 'protractor';
import {ChildAddNewDocumentComponent} from './dialogs/child-add-new-document.component';
import {Child} from '../child.model';

@Component({
  selector: 'child-documents',
  templateUrl: './child-documents.component.html',
  styleUrls: ['./child-documents.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class ChildDocumentsComponent implements OnInit {

  // Private
  private _unsubscribeAll: Subject<any>;
  // allergies: any;
  dialogRef: any;

  documents: any[];
  documentsData: any[];
  healthDocuments: string[];
  legalDocuments: string[];
  otherDocuments: string[];

  @ViewChild(FusePerfectScrollbarDirective)
  directiveScroll: FusePerfectScrollbarDirective;

  buttonLoader: boolean;
  buttonLoader1: boolean;

  uploadTypes: string;
  s3Bucket: string;
  s3Path: string;
  uploadFileMap: object;
  documentDataID: string;
  DocButtonSize: string;

  child: Child;

    /**
     * Constructor
     *
     * @param {Router} _router
     * @param {NGXLogger} _notification
     * @param {NGXLogger} _matDialog
     * @param {Router} _route
     * @param _commonService
     * @param _documentsService
     * @param _formBuilder
     * @param modal
     * @param _logger
     */
  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _notification: NotificationService,
    public _matDialog: MatDialog,
    private _commonService: CommonService,
    private _documentsService: ChildDocumentsService,
    private _formBuilder: FormBuilder,
    private modal: NzModalService,
    private _logger: NGXLogger,
  ) {
    // Set the private defaults
    this._unsubscribeAll = new Subject();


        this.documents = null;
        this.documentsData = [];
        this.healthDocuments = ['healthRecord', 'childImmunised', 'prescribedMedicine', 'anaphylaxis', 'healthConditions', 'asthma', 'epipenOrAnipen'];
        this.legalDocuments = ['courtAppointed'];
        this.otherDocuments = ['birthCertificate'];

        this.uploadTypes = 'image/*, application/pdf';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.CHILD_Profile;
        this.uploadFileMap = {};
        this.DocButtonSize = 'small';
    }

  ngOnInit(): void {

    this._documentsService
      .onDocumentChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        this.documents = response.documents;
        this.documentDataID = response.id;
        if(response.documents)
            this.uploadFileMap = response.documents;
        this.createDocumentArray();
        console.log(this.uploadFileMap);
      });

      this._documentsService
          .onChildChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((child: any) =>
          {
              this._logger.debug('[child booking request - child]', child);

              this.child = child;
          });


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

    getFileName(key: string): string {
        return this._commonService.extractS3FileName(key);
    }



  handleUploadChange(fileList: FileListItem[], inputName: string): void {

      this.uploadFileMap[inputName] = _.map(fileList, 'key');

  }


  /**
    * Update content scroll
    */
  updateScroll(): void {
    this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
  }

    romoveFile(item: any): void {

    }

    findDocument(item) : any
    {
      return this.documentsData.find(element => { return element.name===item})
    }

    deleteFile(doc) : void
    {
        this.modal.confirm({
            nzTitle: 'Are you sure delete this document?',
            nzContent: '<b style="color: red;">This action is irreversible</b>',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => this.deleteDocumentSubmit(doc),
            nzCancelText: 'No',
        });

        /*const x = this.documentsData.find(element => { return element.fileurl.includes(doc)});
        const index = x.fileurl.indexOf(doc);
        if (index > -1) {
            x.fileurl.splice(index, 1);
            const documentIndex = this.documentsData.indexOf(x);
            if(documentIndex > -1)
            {
                this.documentsData[documentIndex] = x;
            }
        }
        setTimeout(() => this._notification.displaySnackBar('Click "Update" to save changes', NotifyType.SUCCESS), 200);*/

    }

    deleteDocumentSubmit(doc): void
    {
        const x = this.documentsData.find(element => { return element.fileurl.includes(doc)});
        const index = x.fileurl.indexOf(doc);
        if (index > -1) {
            x.fileurl.splice(index, 1);
            const documentIndex = this.documentsData.indexOf(x);
            if(documentIndex > -1)
            {
                this.documentsData[documentIndex] = x;
            }
        }
        this.onFormSubmit(null);
    }

    addNewDocument(e: MouseEvent): void
    {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(ChildAddNewDocumentComponent,
                {
                    panelClass: 'child-add-new-document',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            childId : this._route.snapshot.params['id'],
                        }
                    },
                    width: '600px',
                });
    }

  /**
 * go back
 *
 * @param {MouseEvent} e
 */
  onBack(e: MouseEvent): void {
    e.preventDefault();

    this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  disabledPastDates = (current: Date): boolean => {
    return differenceInCalendarDays.default(current, new Date()) < 0;
  }




  onFormSubmit(e: MouseEvent): void
  {
      if(e)
        e.preventDefault();

      const sendObj = {
          documentID: this.documentDataID,
          childId: this._route.snapshot.params['id'],
          upload_files: this.uploadFileMap
      };

      this.buttonLoader = true;
      this._documentsService
          .storeDocuments(sendObj)
          .pipe()
          .subscribe(
                message =>
                {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                  
                },
                error =>
                {
                    this.buttonLoader = false;

                    throw error;
                },
               
            );
    }

    getChildProfileImage(item) : string
    {
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
}
