import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { resolve } from 'dns';
import * as _ from 'lodash';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Child } from '../child.model';
import { ImmunisationMapData } from './immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';
import { ImmunisationTrackingService } from './service/immunisation-tracking.service';

export interface ImmunisationSummary
{
    totalimmunisation: number;
}

@Component({
  selector: 'immunisation-tracking',
  templateUrl: './immunisation-tracking.component.html',
  styleUrls: ['./immunisation-tracking.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationTrackingComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    viewHelpPanel: boolean;
    buttonLoader: boolean;
    immunisationSummary: ImmunisationSummary;
    child: Child;
    immunisationData: ImmunisationMapData[];
    
    ImmunisationTrackingUITypes: typeof AppConst.ImmunisationTrackingUITypes;
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _immunisationTrackingService: ImmunisationTrackingService,
        private _commonService: CommonService,
        private _notification: NotificationService,
    ) 
    { 
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
        this.viewHelpPanel = true;
        this.ImmunisationTrackingUITypes = AppConst.ImmunisationTrackingUITypes;
    }

    ngOnInit() {


        // Subscribe to child enrolment changes
      this._immunisationTrackingService
      .onChildChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((child: any) => {
          this._logger.debug('[immunisation view main]', child);

          this.child = child;
      });

    }

      /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }
    /**
     * display help information
     *
     * @param {MouseEvent} e
     */
    showHelpPanel(e: MouseEvent): void
    {
        e.preventDefault();

        this.viewHelpPanel = !this.viewHelpPanel;
    }

    
    updateTracking(e: MouseEvent): void
    {
        e.preventDefault();
        const sendObj = {
            id: this.child.id
        };

            this._immunisationTrackingService.updateTrackingValue(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        
                    })
                )
                .subscribe(
                    message =>
                    {
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    },
                );
    }

    print(e: MouseEvent): void
    {
        e.preventDefault();
        this._immunisationTrackingService.getReportPdf(this.immunisationData);
    }

    /**
     * get booking summary from calendar component
     *
     * @param {BookingSummary} data
     */
    getImmunisationSummaryUpdates(data: ImmunisationSummary): void
    {
        console.log('data from output', data);
        
        this.immunisationSummary = data;
    }

    
    getImmunisationData(data: ImmunisationMapData[]): void
    {
        console.log('data from output ImmunisationMapData', data);
        
        this.immunisationData = data;
    }

        /**
     * On destroy
     */
    ngOnDestroy(): void
    {

    }

        /**
     * Reload table
     */
    reloadTable(e: MouseEvent): void {

        e.preventDefault();
        this.onTableChange(false);
    }

    onTableChange(reset: boolean = false): void
    {
        
        this._immunisationTrackingService.onTableChanged.next(true);
    }


    getChildProfileImage(item: any) : string
    {
        if(item.image)
        {
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        }
        else
        {
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
        }
    }

}
