import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ReportDependencyervice } from '../../service/report-dependencey.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { NGXLogger } from 'ngx-logger';
import { ReportModel } from '../../model/report.model';
import * as _ from 'lodash';
import { Subject } from 'rxjs/internal/Subject';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService, NzModalRef } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { finalize } from 'rxjs/operators';
import { ReportThemeSelectComponent } from '../../report-theme-select/report-theme-select.component';

@Component({
  selector: 'report-side-nav',
  templateUrl: './report-side-nav.component.html',
  styleUrls: ['./report-side-nav.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ReportSideNavComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    reports: ReportModel[];
    confirmModal: NzModalRef;
    themeModal: NzModalRef;
    buttonLoader: boolean;
    reportName:string;

    constructor(
        private _reportDependencyervice: ReportDependencyervice,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _modalService: NzModalService,
    ) 
    {
        this._unsubscribeAll = new Subject();
    }

  ngOnInit():void {

    this._reportDependencyervice
            .onReportFieldChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((report: ReportModel[]) => {
                this._logger.debug('[report data new in side nav]', report);
                this.reports = report;
            });
  }

  delete(item: ReportModel, e: MouseEvent): void
  {
      e.preventDefault();

      this.confirmModal = this._modalService
          .confirm(
              {
                  nzTitle: AppConst.dialogContent.DELETE.TITLE,
                  nzContent: AppConst.dialogContent.DELETE.BODY,
                  nzWrapClassName: 'vertical-center-modal',
                  nzOkText: 'Yes',
                  nzOkType: 'danger',
                  nzOnOk: () => {
                      return new Promise((resolve, reject) =>
                      {
                          this.buttonLoader = true;

                          this._reportDependencyervice
                              .deleteReport(item.id)
                              .pipe(
                                  takeUntil(this._unsubscribeAll),
                                  finalize(() =>
                                  {
                                      this.buttonLoader = false;
                                      
                                      resolve();
                                  })
                              )
                              .subscribe(
                                  message =>
                                  {
                                      setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                  },
                                  error =>
                                  {
                                      
                                      throw error;
                                  }
                              );
                      });
                  }
              }
          );
  }

  public edit(item: ReportModel, e: MouseEvent): void {

    e.preventDefault();


    this.themeModal = this._modalService
        .create({
            nzTitle: 'Edit Report',
            nzContent: ReportThemeSelectComponent,
            nzMaskClosable: false,
            nzComponentParams: {
                type:  AppConst.modalActionTypes.EDIT,
                name: item.name
            },
            nzFooter: [
                {
                    label: 'UPDATE',
                    type: 'primary',
                    disabled: componentInstance => !(componentInstance!.saveReportSetForm.valid),
                    onClick: componentInstance => {
                        this.reportName = componentInstance.getValues().name,
                        this.themeModal.destroy();
                        const sendObj = {
                            id: item.id,
                            name: this.reportName
                        }
                        this._reportDependencyervice
                            .updareReport(sendObj)
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe(
                                message => {
                                    // this.isLoadingForm = false;
                                    this._notification.clearSnackBar();
                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                },
                                error => {

                                    // this.isLoadingForm = false;

                                    throw error;
                                },
                                () => {
                                    this._logger.debug('😀 all good. 🍺');
                                }
                            );
                        // console.log(this.reportName);
                    }
                },
                {
                    label: 'CLOSE',
                    type: 'danger',
                    onClick: () => this.themeModal.destroy()
                }
            ]

        });

}

}
