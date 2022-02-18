import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Subject } from 'rxjs/internal/Subject';
import { NGXLogger } from 'ngx-logger';
import { Room } from 'app/main/modules/room/models/room.model';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { ChildrenService } from 'app/main/modules/child/services/children.service';
import { RoomService } from 'app/main/modules/room/services/room.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ContactReportservice } from '../../service/contact-report.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import * as jsPDF from 'jspdf'
import { ReportThemeSelectComponent } from '../../report-theme-select/report-theme-select.component';
import { NzModalRef, NzModalService, slideMotion, fadeMotion } from 'ng-zorro-antd';
import { ReportDependencyervice } from '../../service/report-dependencey.service';
import { ReportModel } from '../../model/report.model';
import { log } from 'console';
import {BuslistReportService} from '../../service/buslist-report.service';
import {AppConst} from '../../../../../shared/AppConst';
import { Bus } from 'app/main/modules/service-settings/bus-list/bus-list.model';
@Component({
    selector: 'buslist-report-filter',
    templateUrl: './report-filter.component.html',
    styleUrls: ['./report-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BuslistReportFilterComponent implements OnInit, OnDestroy {


    selectedField: any;
    @ViewChild('htmlData') htmlData:ElementRef;
    private _unsubscribeAll: Subject<any>;

    childList: Child[];
    roomList: Room[];
    busList: Bus[];
    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;
    buttonLoaderDownload: boolean;
    isLoadingForm: boolean;
    calendarWeek: FormControl;
    busListReportSelected: boolean;
    busListReportDailySelected: boolean;

    FilterForm: FormGroup;
    constructor(
        private _logger: NGXLogger,
        private _buslistReportService: BuslistReportService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _reportDependencyervice:ReportDependencyervice
    ) {
        this._unsubscribeAll = new Subject();

        this.isLoadingForm = false;
        this.FilterForm = this.createFilterForm();
        this.calendarWeek = new FormControl(DateTimeHelper.now().toDate());
        this.busListReportSelected = false;
    }

    ngOnInit(): void {

            this._reportDependencyervice
                .onRoomChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((rooms: any) => {
                    this._logger.debug('[rooms-list]', rooms);
                    this.roomList = rooms.items;
                });
            this._reportDependencyervice
                .onBusChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((busList: any) => {
                    this.busList = busList.items;
                });

    }

    onSelectedReportTypeChange(e) : void {
        if(e === 'busListReport' || e === 'busListReportDaily')
        {
            if(e === 'busListReportDaily')
            {
                this.busListReportDailySelected = true;
            }
            else
            {
                this.busListReportDailySelected = false;
            }

            this.busListReportSelected = true;
            this.fc.room.setValidators([Validators.required]);
            this.fc.room.updateValueAndValidity();
            this.fc.room.reset();
            this.fc.bus.setValidators([Validators.required]);
            this.fc.bus.updateValueAndValidity();
            this.fc.bus.reset();
        }

        else
        {
            this.busListReportSelected = false;
            this.fc.room.clearValidators();
            this.fc.room.updateValueAndValidity();
            this.fc.room.reset();
            this.fc.bus.clearValidators();
            this.fc.bus.updateValueAndValidity();
            this.fc.bus.reset();
        }

    }


    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {
        return this.FilterForm.controls;
    }

    get getFormValues(): any {
        if(this.busListReportDailySelected)
        {
            return {
                room: this.fc.room.value,
                bus: this.fc.bus.value,
                sdate: DateTimeHelper.parseMoment(this.fc.calendarWeek.value).format(AppConst.dateTimeFormats.dateOnly),

            };
        }
        else
        {
            return {
                room: this.fc.room.value,
                bus: this.fc.bus.value,
                sdate: DateTimeHelper.parseMoment(this.fc.calendarWeek.value).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),
                edate: DateTimeHelper.parseMoment(this.fc.calendarWeek.value).endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),

            };
        }
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    createFilterForm(): FormGroup {
        return new FormGroup({
             bus: new FormControl(null, []),
             room: new FormControl(null, []),
             type: new FormControl(null, [Validators.required]),
             calendarWeek: new FormControl(null, [Validators.required]),

        });
    }


    viewReport(e: MouseEvent): void {
        e.preventDefault();

        if (this.FilterForm.invalid) {
            return;
        }


        const sendObj = this.getFormValues;

        this._logger.debug('[branch object]', sendObj);

        this.buttonLoader = true;

        this._buslistReportService
            .viewReports(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

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

    downloadPdf(e: MouseEvent, isPdf): void {
        e.preventDefault();

        if (this.FilterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;


        this.isLoadingForm = true;
        this.buttonLoaderDownload = true;
        if(this.fc.type.value === 'busListReport' || this.fc.type.value === 'busListReportDaily')
        {
            sendObj['room_name'] = this.roomList.filter(i => i.id === sendObj['room'])[0].title;
            sendObj['bus_name'] = this.busList.filter(i => i.id === sendObj['bus'])[0].name;
            this._buslistReportService
                .getDataForReport(sendObj, isPdf, this.fc.type.value)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    message => {
                        this.buttonLoaderDownload = false;
                        this.isLoadingForm = false;
                        this._notification.clearSnackBar();
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
        else
        {
            this._buslistReportService
                .getDataForReport(sendObj, isPdf)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    message => {
                        this.buttonLoaderDownload = false;
                        this.isLoadingForm = false;
                        this._notification.clearSnackBar();
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

}
