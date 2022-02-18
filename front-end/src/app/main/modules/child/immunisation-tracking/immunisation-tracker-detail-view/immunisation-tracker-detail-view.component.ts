import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Room } from 'app/main/modules/room/models/room.model';
import { CommonService } from 'app/shared/service/common.service';
import * as _ from 'lodash';
import { slideMotion, fadeMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Child } from '../../child.model';
import * as uuid from 'uuid';
import { ImmunisationTrackingService } from '../service/immunisation-tracking.service';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { ImmunisationSchedule } from 'app/main/modules/immunisation/model/immunisation-schedule.model';
import { ImmunisationSummary } from '../immunisation-tracking.component';
import { ImmunisationTracker } from '../model/immunisation-tracker.model';
import { ImmunisationDateSetDialogComponent } from '../modal/immunisation-date-set-dialog/immunisation-date-set-dialog.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { addDays, addMonths, addWeeks, addYears, differenceInBusinessDays, differenceInCalendarDays, differenceInMonths, parseISO } from 'date-fns';
import { ItemComponent } from '@swimlane/ngx-dnd';
import { AppConst } from 'app/shared/AppConst';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from 'app/shared/service/auth.service';
import { promise } from 'selenium-webdriver';

export interface scheduleDataMap {
    id: string;
    number?: number;
    period?: string;
    trackingDate?: string;
    tracker?: ImmunisationTracker

}
export interface ImmunisationMapData {
    id: string;
    name: string;
    desc?: string;
    creator?: any;
    status?: boolean;
    schedule?: scheduleDataMap[],
    child?: Child

}


@Component({
  selector: 'immunisation-tracker-detail-view',
  templateUrl: './immunisation-tracker-detail-view.component.html',
  styleUrls: ['./immunisation-tracker-detail-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationTrackerDetailViewComponent implements OnInit {

     // Private
    private _unsubscribeAll: Subject<any>;
    child: Child;
    rooms: Room[];
    immunisationTable: ImmunisationMapData[];
    immunisation: Immunisation[];
    immunisationTracker: ImmunisationTracker[];
    viewLoading: boolean;
    isParant: boolean;
    routeParams: any;
    confirmModal: NzModalRef;


    setUserModal: NzModalRef;
    
    @Input() isCreateButtonLoading: boolean;
    
    @Output()
    updateImmunisationSummary: EventEmitter<ImmunisationSummary>;

    @Output()
    immunisationTableData: EventEmitter<ImmunisationMapData[]>;

    constructor(
        private _logger: NGXLogger,
        private _immunisationTrackingService: ImmunisationTrackingService,
        private _commonService: CommonService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _router: Router,
        private _authService: AuthService,
        private _notificationService: NotificationService,
        private _route: ActivatedRoute
    ) {

        // Set the private defaults
        this.isParant = this._authService.isParent();
        this._unsubscribeAll = new Subject();
        this.updateImmunisationSummary = new EventEmitter();
        this.immunisationTableData = new EventEmitter();
        this.immunisationTracker = [];
        this.immunisationTable = [];
        this.viewLoading = this.isParant? true : false;
        if(this.isParant){
            this.loadParentView();
        }
    }

    ngOnInit() {

        this._logger.debug('immunisation view !!!');
        
        // Subscribe to child enrolment changes
        this._immunisationTrackingService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => {
                this._logger.debug('[immunisation view]', child);

                this.child = child;
            });

        // Subscribe to child enrolment changes
        this._immunisationTrackingService
            .onChildImmunisationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((immunisation: any) => {

                this._logger.debug('[immunisation]', immunisation);
                this.immunisation = immunisation;

                if (this.immunisationTracker.length > 0 && !_.isNull(this.immunisationTracker)) {

                        this.buildTableView();
                        this.updateImmunisationSummary.emit(this.ImmunisationSummary);
                        this.immunisationTableData.emit(this.immunisationTable);
                        this._logger.debug('[immunisation table]', this.immunisationTable);
                        
                }

            });

        // Subscribe to get all tracker data
        this._immunisationTrackingService
            .onChildImmunisationTrackerChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((immunisationTracker: any) => {

                this.immunisationTracker = immunisationTracker;
                this._logger.debug('[immunisationTracker]', immunisationTracker);

                if (this.immunisation.length > 0 && !_.isNull(this.immunisation)) {

                    this.buildTableView();
                    this.updateImmunisationSummary.emit(this.ImmunisationSummary);
                    this.immunisationTableData.emit(this.immunisationTable);
                    this._logger.debug('[immunisation table]', this.immunisationTable);
                }
                
                
            });

        // Subscribe to table loader
        this._immunisationTrackingService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {
                this._logger.debug('[table loader]', value);

                this.viewLoading = value;
            });

    }

    loadParentView(){
        
        return new Promise<void>((resolve, reject) =>
        {
            Promise.all([
                this._immunisationTrackingService.getChild(this._route.snapshot.paramMap.get('id')),
                this._immunisationTrackingService.getImmunisation(this._route.snapshot.paramMap.get('id')),
                this._immunisationTrackingService.getImmunisationTracker(this._route.snapshot.paramMap.get('id'))
            ])
            .then(([child, immunisation, immunisationTracker]: [any, any, any]) => 
            {
                if(this.immunisation.length === 0){
                    setTimeout(() => this._notificationService.displaySnackBar('No Immunisation Found', NotifyType.WARNING), 200);
                    reject();
                }

                resolve();
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    getImmunisationImage(): string {
        return `assets/icons/flat/ui_set/custom_icons/child/immune-system.svg`;
    }

      /**
     * build table layout
     */
    buildTableView(): void
    {

        // reset calendar view
        this.immunisationTable = [];

        setTimeout(() =>
        {
            for (const item of this.immunisation)
            {
                let sheduleItem :scheduleDataMap[] = [];
                
                for(const single of item.schedule) {

                    sheduleItem.push({
                        id: single.id,
                        number: single.number,
                        period: single.period,
                        trackingDate: single.getTrackingDate(this.child),
                        tracker: this.immunisationTracker.length > 0? this.getScheduleMap(single) : null
                    })
                }

                this.immunisationTable.push({
                    id: item.id,
                    name: item.name,
                    desc: item.desc,
                    creator: item.creator,
                    status: item.status,
                    schedule: sheduleItem,
                })
            }
        });
    }

    getPeriodTitle(item: string): string {
        
        return AppConst.ImmunisationOption.find(v => (v.value === item)).name;
    }

    getScheduleMap(schedule: ImmunisationSchedule): ImmunisationTracker {

        let singleTracker = null;

            singleTracker = this.immunisationTracker.find(v=> v.schedule.id === schedule.id)
            
            if(singleTracker && !_.isNull(singleTracker)) {
                
                return singleTracker;
            }

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

    get ImmunisationSummary(): ImmunisationSummary
    {
        if(!this.immunisation)
        {
            return null;
        }

        let _total = 0;

        for (const item of this.immunisation)
        {
            // console.log('bookingSummary', item);
            
            if (item.schedule)
            {
                _total += 1;
                
            }
        }

        return {
            totalimmunisation: _total,
        };
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }
    

    editSlot(e: MouseEvent, schedule: scheduleDataMap, immunisation: Immunisation): void {

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
                    child: this.child,
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

                            this.addDate(selectedDate, schedule, immunisation);
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

    addDate(date: any, schedule: scheduleDataMap, immunisation: Immunisation): Promise<any> 
    {
        const sendObj = {
            child: this.child.id,
            schedule: schedule.id,
            immunisation: immunisation.id,
            date: date ? DateTimeHelper.getUtcDate(date) : null,
            tracker: schedule.tracker? schedule.tracker.id : null
        };

        console.log('send obj', sendObj);
        
        return new Promise((resolve, reject) =>
        {

            this.viewLoading = true;
            this._immunisationTrackingService
            [schedule.tracker? 'updateTracking' : 'createTracking'](sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        this.viewLoading = false;
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
                            this._immunisationTrackingService
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

    
    openImmunisation(e: MouseEvent){

        e.preventDefault();
        this._router.navigate(['/manage-immunisation'])

    }

    getTrackingDate(schedule: ImmunisationSchedule):any {

        let date;
        let dob =  DateTimeHelper.getUtcDate(this.child.dob)
        if(schedule.period === 'W') {

            date = addWeeks(parseISO(dob), schedule.number)
        }
        if(schedule.period === 'M'){

            date = addMonths(parseISO(dob), schedule.number)
        }

        if(schedule.period === 'Y'){

            date = addYears(parseISO(dob), schedule.number)
        }

        return DateTimeHelper.getUtcDate(date);

    }

    getFormatedDate(date: string) {

        return date? DateTimeHelper.getUtcDate(parseISO(date), 'DD-MM-YYYY'): 'N/A';
    }

   
}
