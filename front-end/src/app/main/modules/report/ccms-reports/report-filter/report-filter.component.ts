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
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import * as jsPDF from 'jspdf'
import { NzModalRef} from 'ng-zorro-antd';
import { ReportDependencyervice } from '../../service/report-dependencey.service';
import { CCMSReportservice } from '../../service/ccms-report.service';
import { AppConst } from 'app/shared/AppConst';
import { finalize } from 'rxjs/operators';

export interface CCSEnromentReportType {
    value: string;
    name: string;
};
export interface CCSEnromentArrangementType {
    value: string;
    name: string;
}
@Component({
    selector: 'ccms-report-filter',
    templateUrl: './report-filter.component.html',
    styleUrls: ['./report-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CCMSReportFilterComponent implements OnInit, OnDestroy {

    themeModal: NzModalRef;

    reportTypes: CCSEnromentReportType[];

    @ViewChild('htmlData') htmlData:ElementRef;
    private _unsubscribeAll: Subject<any>;

    childList: Child[];
    roomList: Room[];
    ccsFilters: Array<any>;
    arrangementTypes: CCSEnromentArrangementType[];
    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;
    buttonLoaderDownload: boolean;
    filterByChild: boolean;
    size: number;
    isLoadingForm: boolean;

    filterForm: FormGroup;
    constructor(
        private _logger: NGXLogger,
        private _ccmsReportService: CCMSReportservice,
        private _notification: NotificationService,
        private _reportDependencyervice:ReportDependencyervice
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.isLoadingForm = false;
        this.filterForm = this.createfilterForm();
        this.reportTypes = this._ccmsReportService.getReportTypes();
        this.arrangementTypes = this._ccmsReportService.getEnrolmentArrangementTypes();

    }

    ngOnInit(): void {

        this._ccmsReportService
        .onFilterDependencyChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) =>
        {
            this._logger.debug('[dependency]', response);
            this.ccsFilters = response.depend.CCSFilters
        });

        this._reportDependencyervice
            .onRoomChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: any) => {
                this._logger.debug('[rooms-list]', rooms);
                this.roomList = rooms.items;
            });

    }


    ngOnDestroy(): void {
        this.filterForm.get('report_ype').patchValue(AppConst.CCMSReportTypes.CCMS_ENROLMENT_REPORT);
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {

        return this.filterForm.controls;
    }

    get getFormValues(): any {
        return {
            room: this.fc.room.value,
            report_ype: this.fc.report_ype.value,
            created_date_start: DateTimeHelper.getUtcDate(this.fc.created_date_start.value),
            created_date_end: DateTimeHelper.getUtcDate(this.fc.created_date_end.value),
            enrolment_date_start: DateTimeHelper.getUtcDate(this.fc.enrolment_date_start.value),
            enrolment_date_end: DateTimeHelper.getUtcDate(this.fc.enrolment_date_end.value),
            enrolment_type: this.fc.enrolment_type.value,
            enrolment_status: this.fc.enrolment_status.value,
            status_toggle: this.fc.status_toggle.value,
        };
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    createfilterForm(): FormGroup {
        return new FormGroup({
            created_date_start: new FormControl(null, []),
            created_date_end: new FormControl(null, []),
            enrolment_date_start: new FormControl(null, []),
            enrolment_date_end: new FormControl(null, []),

            room: new FormControl(null, []),
            report_ype: new FormControl(null, [Validators.required]),
            enrolment_type: new FormControl(null, []),
            enrolment_status: new FormControl(null, []),
            status_toggle: new FormControl(false),

        });
    }


    
    viewReport(e: MouseEvent, view: boolean, isPdf: boolean): void {
        e.preventDefault();

        if (this.filterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;

        this._logger.debug('[send object]', sendObj);

        this.buttonLoader = true;

        if (this.fc.report_ype.value === AppConst.CCMSReportTypes.CCMS_ENROLMENT_REPORT) {

            this._ccmsReportService
                .getEnrolmentReportData(sendObj, this.fc.report_ype.value, view, isPdf)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => {
                        this.buttonLoader = false;
                    })
                )
                .subscribe();

        }
    }

    downloadPdf(e: MouseEvent, isPdf): void {

        e.preventDefault();

        if (this.filterForm.invalid) {
            return;
        }


    }

    toggleSelectAllRooms(value: boolean): void {

        if (value === true) {
            this.filterForm.get('room').patchValue(_.map(this.roomList, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('room').patchValue([], { emitEvent: false });
        }

    }

    public openPDF(): void {

        const DATA = this.htmlData.nativeElement;
        const doc = new jsPDF('p', 'pt', 'a4');
        doc.fromHTML(DATA.innerHTML, 15, 15);
        doc.output('dataurlnewwindow');
    }

    toggleSelectAllRoom(value: boolean): void {

        if (value === true) {
            this.filterForm.get('room').patchValue(_.map(this.roomList, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('room').patchValue([], { emitEvent: false });
        }

    }

}
