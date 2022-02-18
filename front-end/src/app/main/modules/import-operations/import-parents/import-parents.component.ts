import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Organization } from '../../organization/Models/organization.model';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { NGXLogger } from 'ngx-logger';
import { ImportCCSEnrolmentService } from '../ccs-enrolments/services/import-enrolments.service';
import { GetParentsImportModalComponent } from './modal/get-parents-import-modal/get-parents-import-modal.component';
import { ImportParentService } from './service/import-parent.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Branch } from '../../branch/branch.model';
import * as _ from 'lodash';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { User } from '../../user/user.model';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { finalize } from 'rxjs/operators';
import { ParentsSyncKinderConnectModelComponent } from './modal/parents-sync-kinder-connect-model/parents-sync-kinder-connect-model.component';
import { FinanceReportservice } from '../../report/service/finance-report.service';

@Component({
  selector: 'app-import-parents',
  templateUrl: './import-parents.component.html',
  styleUrls: ['./import-parents.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportParentsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dialogRef: any;
    organizations: Organization[];
    organization: Organization;
    branch: Branch;
    buttonLoader: boolean;
    importModal: NzModalRef;
    importedData: any;
    users: User[];

    // @ViewChild(ImportCCSEnrollmentsListViewComponent)
    // listViewComponent: ImportCCSEnrollmentsListViewComponent;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    @Output()
    updateScroll: EventEmitter<boolean>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _matDialog: MatDialog,
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _parentImportService: ImportParentService,
        private _notificationService: NotificationService,
    )
    {
        // set default values
        this.organizations = [];
        this.organization = null;
        this.importedData = [];
        this.users= [];
        this.buttonLoader = false;
        this.updateScroll = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

  ngOnInit() {

    this._logger.debug('import ccs enrollments !!!');

        // Subscribe to resource changes
        this._parentImportService
            .onDependsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => this.organizations = data.subscribers);

            this._parentImportService
            .onParentsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {
                this.importedData = data;
                this.users = data.user;
                this.organization = _.find(this.organizations, ['id', data.org][0]);
                this.branch = _.find(this.organization.branch, ['id', data.branch][0]);
                console.log('data', data);
                
            });
            
  }



  trackByFn(index: number, item: any): number
  {
      return index;
  }
  onTabCollapsed(value: boolean): void
  {
      console.log('expand');
      
      this.updateScroll.next(true);
  }

  ngOnDestroy(): void
  {
      if (this.importModal)
      {
          this.importModal.close();    
      }

      this._parentImportService.unsubscribeOptions();

      this.updateScroll.unsubscribe();
      // Unsubscribe from all subscriptions
      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
  }

  addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        this.importModal = this._modalService
            .create({
                nzTitle: 'Import Parents',
                nzContent: GetParentsImportModalComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'get-parents-import-modal',
                nzComponentParams: {
                    organizations: this.organizations
                },
                nzFooter: [
                    {
                        label: 'IMPORT',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.form.valid),
                        onClick: (componentInstance) => {componentInstance
                            .getEnrollments(), this.importModal.destroy(), this.update()},
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.importModal.destroy()
                    }
                ]
            });
    }

    update(): void
    {        
        
        this.buttonLoader = true;

        this._parentImportService
            .update(this.importedData)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.buttonLoader = false;
                    setTimeout(() => this._notificationService.displaySnackBar(message, NotifyType.SUCCESS), 200);
                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
        return;
    }

    sync(e: MouseEvent): void {

        e.preventDefault();
        // this.buttonLoader = true;

        setTimeout(
            () => (
                // (this.buttonLoader = false),
                (this.dialogRef = this._matDialog.open(ParentsSyncKinderConnectModelComponent, {
                    panelClass: 'parents-sync-kinder-connect-model',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        organizations: this.organizations
                    }
                })),
                this.dialogRef.afterClosed().subscribe(message => {
                    if (!message) {
                        return;
                    }

                    this._notificationService.clearSnackBar();

                    setTimeout(
                        () =>
                            this._notificationService.displaySnackBar(
                                message,
                                NotifyType.SUCCESS
                            ),
                        200
                    );
                })
            ),
            300
        );

        // this.dialogRef = this._matDialog
        //         .open(ParentsSyncKinderConnectModelComponent,
        //         {
        //             panelClass: 'branch-new-dialog',
        //             closeOnNavigation: true,
        //             disableClose: true,
        //             autoFocus: false,
        //             data: {
        //                 action: AppConst.modalActionTypes.NEW,
        //                 organizations: this.organizations
        //             }
        //         });
                
        //     this.dialogRef
        //         .afterClosed()
        //         .pipe(takeUntil(this._unsubscribeAll))
        //         .subscribe(message =>
        //         {                            
        //             if ( !message )
        //             {
        //                 return;
        //             }
    
        //             this._notificationService.clearSnackBar();
    
        //             setTimeout(() => this._notificationService.displaySnackBar(message, NotifyType.SUCCESS), 200);
        //         });
    }

    

}
