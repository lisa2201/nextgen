import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { slideMotion, fadeMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize, debounceTime } from 'rxjs/operators';
import { NavigationService } from 'app/shared/service/navigation.service';
import { ImmunisationData, ImmunisationMatrixData, ImmunisationReportservice } from '../../service/immunisation-report.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { addDays, addMonths, addWeeks, addYears, differenceInBusinessDays, differenceInCalendarDays, differenceInMonths, parseISO } from 'date-fns';
import { ItemComponent } from '@swimlane/ngx-dnd';
import { AppConst } from 'app/shared/AppConst';
import { scheduleDataMap } from '../../../child/immunisation-tracking/immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';
import { ImmunisationTracker } from '../../../child/immunisation-tracking/model/immunisation-tracker.model';
import { ImmunisationSchedule } from '../../../immunisation/model/immunisation-schedule.model';
import * as _ from 'lodash';
import { ImmunisationDateSetDialogComponent } from 'app/main/modules/child/immunisation-tracking/modal/immunisation-date-set-dialog/immunisation-date-set-dialog.component';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { ImmunisationTrackingService } from 'app/main/modules/child/immunisation-tracking/service/immunisation-tracking.service';
import { Child } from 'app/main/modules/child/child.model';

@Component({
  selector: 'immunisation-report-list-view',
  templateUrl: './immunisation-report-list-view.component.html',
  styleUrls: ['./immunisation-report-list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationReportListViewComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    immunisationTable: ImmunisationMatrixData[];
    immunisationTracker: ImmunisationTracker[];
    heading: Array<any>= [];
    setUserModal: NzModalRef;
    confirmModal: NzModalRef;

    constructor(
        private _logger: NGXLogger,
        private _immunisationReportService: ImmunisationReportservice,
        private _navService: NavigationService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
    ) {
        this._unsubscribeAll = new Subject();
        this.immunisationTable = [];
        this.immunisationTracker = [];
        this.heading = [];
    }

    ngOnInit() {

        this._immunisationReportService
            .onMatrixDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: ImmunisationMatrixData[]) => {
                this._logger.debug('[report list view]', data);
                this.immunisationTable = data;
                if(this.immunisationTable.length > 0){
                    this.buildHeader();
                }
            });

            this._immunisationReportService
            .onImmunisationTrackerChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((immunisationTracker: any) => {

                this.immunisationTracker = immunisationTracker;
                
            });

    }

    buildHeader():void{
        this.heading = [];
        for (const item of this.immunisationTable[0].immunisationData) {

            this.heading.push(`${item.name}`);

        }

        this.heading.unshift('Action');
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    openChildProfile(e: MouseEvent, id: string): void
    {
        e.preventDefault();

        this._navService.goToChildProfileNewTab(id);
    }

    getSlotColor(slot: scheduleDataMap): string {
        
        let className: string = '';
        
        if(slot.tracker){
            className = 'hasDate';
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(slot.trackingDate), new Date()) < 1) {

            className = 'pastDue';
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(slot.trackingDate),new Date()) <= 30) {

            // console.log('soon', differenceInCalendarDays(parseISO(slot.trackingDate), new Date()));
            
            className = 'dueSoon';
        }
        else {
            className = '';
        }

        return className;
        
        
    }

    getHelperText(slot: scheduleDataMap): string {
        
        let text: string = '';

        if(slot.tracker){

            text = `${AppConst.ImmunisationTrackingUITypes.find(v => v.color === 'hasDate').name} by ${slot.tracker.creator.getFullName()} on ${DateTimeHelper.getUtcDate(parseISO(slot.tracker.updatedAt),'DD-MM-YYYY')}`;
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(slot.trackingDate), new Date()) < 1) {

            text = AppConst.ImmunisationTrackingUITypes.find(v => v.color === 'pastDue').name;
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(slot.trackingDate),new Date()) <= 30) {

            text = AppConst.ImmunisationTrackingUITypes.find(v => v.color === 'dueSoon').name;
        }
        else {
            text = 'N/A';
        }

        return text;
        
        
    }

    getPeriodTitle(item: string): string {
        
        return AppConst.ImmunisationOption.find(v => (v.value === item)).name;
    }

    getFormatedDate(date: string) {

        return date? DateTimeHelper.getUtcDate(parseISO(date), 'DD-MM-YYYY'): 'N/A';
    }

    editSlot(e: MouseEvent, schedule: scheduleDataMap, immunisation: Immunisation, child: Child): void {

        e.preventDefault();
        const isEdit: boolean = schedule.tracker ? true: false;

        this.setUserModal = this._modalService
            .create({
                nzTitle: isEdit ? 'Edit Date':'Set Date',
                nzContent: ImmunisationDateSetDialogComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'immunisation-date-set-dialog',
                nzComponentParams: {
                    isEdit: isEdit,
                    child: child,
                    schedule: schedule,
                    immunisation: immunisation
                },
                nzFooter: [
                    {
                        label: 'CLEAR DATA',
                        type: 'default',
                        disabled: !isEdit,
                        onClick: componentInstance => {
                            this.deleteSlot(schedule)
                            this.setUserModal.destroy();
                        }
                    },
                    {
                        label: 'SAVE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.dateSetForm.valid),
                        onClick: componentInstance => {
                            const selectedDate = componentInstance.getSelectedDate();

                            this.addDate(selectedDate, schedule, immunisation, child);
                            
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.setUserModal.destroy()
                    }
                ]
            });

    }

    addDate(date: any, schedule: scheduleDataMap, immunisation: Immunisation, child: Child): Promise<any> 
    {
        const sendObj = {
            child: child.id,
            schedule: schedule.id,
            immunisation: immunisation.id,
            date: date ? DateTimeHelper.getUtcDate(date) : null,
            tracker: schedule.tracker? schedule.tracker.id : null
        };

        console.log('send obj', sendObj);
        
        return new Promise((resolve, reject) =>
        {

            // this.viewLoading = true;
            this._immunisationReportService
            [schedule.tracker? 'updateTracking' : 'createTracking'](sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        
                        resolve(null);
                    })
                )
                .subscribe(
                    message =>
                    {
                        this.setUserModal.destroy();
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    },
                    error =>
                    {
                        reject(error);
                    }
                );
            
        });

    }

    markAll(e: MouseEvent,immunisationData: ImmunisationData[], isAllChecked: boolean): Promise<any> {

        e.preventDefault();

        if(isAllChecked) {
            return;
        }
        const sendObj = {
            data: immunisationData,
        };
        return new Promise((resolve, reject) =>
        {

            // this.viewLoading = true;
            this._immunisationReportService.bulkUpdateByChild(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        
                        resolve(null);
                    })
                )
                .subscribe(
                    message =>
                    {
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    },
                    error =>
                    {
                        reject(error);
                    }
                );
            
        });
    }

    ClearAll(e: MouseEvent,immunisationData: ImmunisationData[], isAllChecked: boolean): Promise<any> {

        let ids = [];
        e.preventDefault();

        _.forEach(immunisationData,v=>{

            ids.push(v.schedule[0].tracker.id);
        });
        
        const sendObj = {
            index: ids,
        };

        console.log('clear data object', sendObj);
        
        return new Promise((resolve, reject) =>
        {

            // this.viewLoading = true;
            this._immunisationReportService.bulkDeleteByChild(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        
                        resolve(null);
                    })
                )
                .subscribe(
                    message =>
                    {
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    },
                    error =>
                    {
                        reject(error);
                    }
                );
            
        });
    }

    deleteSlot(schedule: scheduleDataMap):void{


        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () =>
                    {
                        return new Promise((resolve, reject) =>
                        {
                            this._immunisationReportService
                                .deleteTracker(schedule.tracker.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );

    }
}
