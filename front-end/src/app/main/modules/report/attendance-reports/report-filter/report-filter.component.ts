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
import { AttendanceReportservice } from '../../service/attendance-report.service';
import { ReportThemeSelectComponent } from '../../report-theme-select/report-theme-select.component';
import { NzModalRef, NzModalService, slideMotion, fadeMotion } from 'ng-zorro-antd';
import { ReportDependencyervice } from '../../service/report-dependencey.service';
import { ReportModel } from '../../model/report.model';
import { log } from 'console';
import { finalize } from 'rxjs/operators';
@Component({
    selector: 'attendance-report-filter',
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
export class AttendanceReportFilterComponent implements OnInit, OnDestroy {

    themeModal: NzModalRef;
    reportName: string;

    filterBy = [
        {
            index: 'CHILD',
            name: 'Child'
        },
        {
            index: 'ROOM',
            name: 'Room'
        }
    ];
    reports: ReportModel[];
    defaultSelectedField: any = [];
    saveDefaultSelectedField: any = [];
    selectedField: any;
    @ViewChild('htmlData') htmlData: ElementRef;
    private _unsubscribeAll: Subject<any>;

    childList: Child[];
    roomList: Room[];
    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;
    buttonLoaderDownload: boolean;
    filterByChild: boolean;
    size: number;
    isLoadingForm: boolean;
    isWeeklyUtilisationReportSelected: boolean;
    reportType: string;

    FilterForm: FormGroup;
    constructor(
        private _logger: NGXLogger,
        private _attendanceReportService: AttendanceReportservice,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _reportDependencyervice: ReportDependencyervice
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.filterByChild = true;
        this.size = 4;
        this.isLoadingForm = false;
        // this.selectedField = this.ASR;
        // this.defaultSelectedField = _.map(this.selectedField, (i) => i.res);
        this.FilterForm = this.createFilterForm();
        this.isWeeklyUtilisationReportSelected = false;
        this.reportType = '';

    }

    ngOnInit(): void {
        this.FilterForm.get('filterBy').patchValue('CHILD');
        this._reportDependencyervice
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report filter view]', response);

                this.childList = response.items;
            });

        this._reportDependencyervice
            .onReportFieldChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((report: ReportModel[]) => {
                this._logger.debug('[report data new]', report);
                this.reports = report;
                this.FilterForm.get('type').patchValue(_.filter(this.reports, (repo) => repo.isFav === true && repo.reportType !== 'ATT_UR').length > 0 ? _.filter(this.reports, (repo) => repo.isFav === true && repo.reportType !== 'ATT_UR')[0].reportType : _.filter(this.reports, (repo) => repo.reportType !== 'ATT_UR')[0].reportType);
                this.setSelectedField(this.fc.type.value)
                this.reportType = this.fc.type.value;

            });

        this._reportDependencyervice
            .onRoomChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: any) => {
                this._logger.debug('[rooms-list]', rooms);
                this.roomList = rooms.items;
            });

        this.valueChange();
    }

    valueChange(): void {

        this.FilterForm
            .get('filterBy')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[filter value change]', value);

                if (!_.isNull(value)) {
                    this.isLoadingForm = true;
                    if (this.fc.type.value !== 'ATT_UR' && !this.isWeeklyUtilisationReportSelected) {

                        this.validateArrangementType(value)
                    }


                    if (value === 'CHILD') {
                        this.filterByChild = true;
                    }
                    else {

                        this.filterByChild = false;
                    }

                    setTimeout(() => this.isLoadingForm = false, 500);
                }
                else {
                    // this.selectedServices = [];
                }

            });

        this.FilterForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._attendanceReportService.unsubscribeOptions();
                this._logger.debug('[report type value change]', value);
                if (!_.isNull(value)) {
                    console.log(value);
                    this.reportType = value;
                    this.isLoadingForm = true;

                    this.setValidation(value);

                    if (this.fc.type.value !== 'ATT_UR') {

                        this.setSelectedField(value);
                    }

                    if (value.substring(0, 7) === 'ATT_OUR') {
                        this.filterBy = [
                            {
                                index: 'ROOM',
                                name: 'Room'
                            }
                        ];
                        // this.FilterForm.get('filterBy').disable({ emitEvent: false });
                        this.FilterForm.get('filterBy').patchValue('ROOM');
                    }
                    else {
                        this.filterBy = [
                            {
                                index: 'CHILD',
                                name: 'Child'
                            },
                            {
                                index: 'ROOM',
                                name: 'Room'
                            }
                        ];
                        this.FilterForm.get('filterBy').enable({ emitEvent: false });
                    }
                }
                else {

                }

                if(this.fc.type.value === 'ATT_UR'){

                    // this.FilterForm.get('room').patchValue('0',{ emitEvent: false });
                    // this.FilterForm.get('child').patchValue('0', { emitEvent: false });
                    this.FilterForm.get('room_sigle').patchValue('0', { emitEvent: false });
                    this.FilterForm.get('child_sigle').patchValue('0', { emitEvent: false });
                }
                else{
                    this.FilterForm.get('room_sigle').patchValue(null, { emitEvent: false });
                    this.FilterForm.get('child_sigle').patchValue(null, { emitEvent: false });
                }
                setTimeout(() => this.isLoadingForm = false, 500);
            });
            
            

    }

    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {
        return this.FilterForm.controls;
    }

    get getFormValues(): any {
        return {
            filterBy: this.fc.filterBy.value,
            child: this.fc.child.value,
            room: this.fc.room.value,
            type: this.fc.type.value,
            field: this.fc.field.value,
            sdate: DateTimeHelper.getUtcDate(this.fc.sdate.value),
            edate: DateTimeHelper.getUtcDate(this.fc.edate.value),
            status_toggle: this.fc.status_toggle.value,
            week: {
                start: this.fc.type.value === 'ATT_UR' ? DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD') : null,
                end:  this.fc.type.value === 'ATT_UR' ? DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD') : null
            },
            session_time: this.fc.session_time.value,
            room_sigle: this.fc.room_sigle.value,
            child_sigle: this.fc.child_sigle.value,
            absence_toggle: this.fc.absence_toggle.value,
            care_provider_toggle: this.fc.care_provider_toggle.value,
        };
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            filterBy: new FormControl(null, [Validators.required]),
            child: new FormControl(null, [Validators.required]),
            room: new FormControl(null, []),
            type: new FormControl(null, [Validators.required]),
            field: new FormControl(null, [Validators.required]),
            sdate: new FormControl(null, []),
            edate: new FormControl(null, []),
            status_toggle: new FormControl(false),
            week: new FormControl(null, []),
            session_time: new FormControl(false),
            child_sigle: new FormControl(null, []),
            room_sigle: new FormControl(null, []),
            absence_toggle: new FormControl(false),
            care_provider_toggle: new FormControl(false),

        });
    }

    setValidation(value): void {

        setTimeout(() => {
            this.isWeeklyUtilisationReportSelected = false;
            if (value === 'ATT_UR') {

                // this.FilterForm.get('filterBy').clearValidators();
                this.FilterForm.get('child').clearValidators();
                this.FilterForm.get('room').clearValidators();
                // this.FilterForm.get('type').clearValidators();
                this.FilterForm.get('field').clearValidators();

                this.FilterForm.get('week').setValidators([Validators.required]);

            }
            else if (value === 'WUS')
            {
                this.isWeeklyUtilisationReportSelected = true;
                this.FilterForm.get('child').clearValidators();
                this.FilterForm.get('child').reset();
                this.FilterForm.get('room').clearValidators();
                this.FilterForm.get('room').reset();
                this.FilterForm.get('filterBy').clearValidators();
                this.FilterForm.get('field').clearValidators();

            }
            else {

                // this.FilterForm.get('filterBy').setValidators([Validators.required]);
                this.FilterForm.get('child').setValidators([Validators.required]);
                // this.FilterForm.get('type').setValidators([Validators.required]);
                this.FilterForm.get('field').setValidators([Validators.required]);

                this.FilterForm.get('week').clearValidators();

            }
            this.FilterForm.get('filterBy').updateValueAndValidity();
            this.FilterForm.get('child').updateValueAndValidity();
            this.FilterForm.get('room').updateValueAndValidity();
            // this.FilterForm.get('type').updateValueAndValidity();
            this.FilterForm.get('field').updateValueAndValidity();

            this.FilterForm.get('week').updateValueAndValidity();

        }, 500);

    }


    setSelectedField(value): void {
        this.selectedField = (_.map(_.filter(this.reports, (val) => val.reportType === value), 'field'))

        this.defaultSelectedField = _.map(this.selectedField[0], (i) => i.res);
        this.saveDefaultSelectedField = _.map(_.filter(this.selectedField[0], (i) => i.isSaved === true), 'res');
        this._logger.debug('[saveDefaultSelectedField 1st]', this.saveDefaultSelectedField);
        this.FilterForm.get('field').patchValue(this.saveDefaultSelectedField.length > 0 ? this.saveDefaultSelectedField : this.defaultSelectedField.slice(0, 4));

    }

    setDefaultField(): void {
        console.log('this.selectedField', this.selectedField);

        setTimeout(() => {
            this.defaultSelectedField = _.map(this.selectedField, (i) => i.isSaved ? i.res : [])
            this.saveDefaultSelectedField = _.map(this.selectedField, (i) => i.isSaved ? i.res : [])
            this.FilterForm.get('field').patchValue(this.saveDefaultSelectedField[0].length > 1 ? this.saveDefaultSelectedField : this.defaultSelectedField.slice(0, 4));
        }, 500);
    }


    saveField(e: MouseEvent): void {
        e.preventDefault();

        this.isLoadingForm = true;
        const getSelectedField = [];
        console.log(this.selectedField);

        _.forEach(this.selectedField[0], (field) => {
            getSelectedField.push({
                name: field.name,
                res: field.res,
                isSaved: _.indexOf(this.fc.field.value, field.res) === -1 ? false : true
            })
        })
        const sendObj = {
            field: getSelectedField,
            type: this.fc.type.value,
            masterType: this.reports[0].masterType,
            name: this.reports.find(val => val.reportType === this.fc.type.value).name
        }
        console.log(sendObj);

        // const index = this.reports.indexOf(this.reports.find(element => element.reportType === this.fc.type.value))
        // console.log('index', index);

        this._reportDependencyervice
            .saveField(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.isLoadingForm = false;
                    this._notification.clearSnackBar();
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                },
                error => {

                    this.isLoadingForm = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    viewReport(e: MouseEvent): void {
        e.preventDefault();

        if (this.FilterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;
        const getSelectedField = [];

        if (sendObj['type'] === 'OUR' && sendObj['room'].length > 1) {

            setTimeout(() => this._notification.displaySnackBar('Please select one room', NotifyType.WARNING), 200);
            return

        }

        this.buttonLoader = true;

        if (this.fc.type.value === 'ATT_UR') {

            console.log('getSelectedField', getSelectedField);

            this._logger.debug('[branch object] viewUtilisationReport', sendObj);

            this._attendanceReportService
                .viewUtilisationReport(sendObj, this.fc.week.value, true, false,)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => {
                        this.buttonLoader = false;
                    })
                )
                .subscribe();

        }

        else {
            _.forEach(this.fc.field.value, (v, i) => {

                const found = this.selectedField[0].find(element => element.res === v);

                if (found) {

                    const index = this.selectedField[0].indexOf(found);

                    getSelectedField.push({
                        name: this.selectedField[0][index]['name'],
                        res: this.selectedField[0][index]['res'],
                        isSaved: true
                    });
                }
            });

            console.log('getSelectedField', getSelectedField);

            this._logger.debug('[branch object] else', sendObj);

            this._attendanceReportService
                .viewReports(sendObj, getSelectedField)
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

        if (this.FilterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;
        const getSelectedField = [];


        this.isLoadingForm = true;
        this.buttonLoaderDownload = true;

        if (this.fc.type.value === 'ATT_UR') {

            console.log('getSelectedField', getSelectedField);

            this._logger.debug('[branch object] viewUtilisationReport', sendObj);

            this._attendanceReportService
                .viewUtilisationReport(sendObj, this.fc.week.value, false, isPdf)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => {

                        this.isLoadingForm = false;
                        this.buttonLoaderDownload = false;
                    })
                )
                .subscribe();

        }
        else {

            _.forEach(this.fc.field.value, (v, i) => {

                const found = this.selectedField[0].find(element => element.res === v);

                if (found) {
                    const index: number = this.selectedField[0].indexOf(found);
                    console.log('index', index);

                    if (sendObj['type'] !== 'OUR') {
                        getSelectedField.push({
                            name: this.selectedField[0][index]['name'],
                            res: this.selectedField[0][index]['res']
                        });
                    }
                    else {
                        getSelectedField.push({
                            name: this.selectedField[0][index]['res'] === 'roomCapacity' ? this.roomList.find(x => x.id === sendObj['room'][0]).title : this.selectedField[0][index]['name'],
                            res: this.selectedField[0][index]['res']
                        });
                    }
                }

            });

            // const report = _.filter(this.reports, (repo)=> repo.reportType === this.fc.type,)[0]
            const report = _.find(this.reports, ['reportType', this.fc.type.value]);


            this._attendanceReportService
                .getDataForReport(sendObj, isPdf, getSelectedField, report)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => {
                        this.isLoadingForm = false;
                        this.buttonLoaderDownload = false;
                    })
                )
                .subscribe();
        }


    }

    toggleSelectAllRooms(value: boolean): void {

        if (value === true) {
            this.FilterForm.get('room').patchValue(_.map(this.roomList, 'id'), { emitEvent: false });
        } else {
            this.FilterForm.get('room').patchValue([], { emitEvent: false });
        }

    }

    toggleSelectAllChild(value: boolean): void {

        if (value === true) {
            this.FilterForm.get('child').patchValue(_.map(this.childList, 'id'), { emitEvent: false });
        } else {
            this.FilterForm.get('child').patchValue([], { emitEvent: false });
        }

    }
    toggleSelectAllField(value: boolean): void {

        if (value === true) {
            this.FilterForm.get('field').patchValue(_.map(this.selectedField[0], 'res'), { emitEvent: false });
        } else {
            this.FilterForm.get('field').patchValue([], { emitEvent: false });
        }

        console.log('check lenght', this.fc.field.value.length);

    }

    validateArrangementType(mode: string): void {
        setTimeout(() => {
            if (mode === 'CHILD') {
                this.fc.child.setValidators([Validators.required]);
                this.fc.room.clearValidators();
            }
            else {
                this.fc.room.setValidators([Validators.required]);
                this.fc.child.clearValidators();
            }
            this.fc.room.updateValueAndValidity();
            this.fc.child.updateValueAndValidity();
        }, 50);
    }

    public openPDF(): void {

        const DATA = this.htmlData.nativeElement;
        const doc = new jsPDF('p', 'pt', 'a4');
        doc.fromHTML(DATA.innerHTML, 15, 15);
        doc.output('dataurlnewwindow');
    }
    public saveAs(e: MouseEvent): void {

        e.preventDefault();

        if (!this.fc.type.value && !this.fc.field.value) {
            return;
        }

        this.themeModal = this._modalService
            .create({
                nzTitle: 'Save Report',
                nzContent: ReportThemeSelectComponent,
                nzMaskClosable: false,
                nzComponentParams: {
                },
                nzFooter: [
                    {
                        label: 'SAVE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.saveReportSetForm.valid),
                        onClick: componentInstance => {
                            this.reportName = componentInstance.getValues().name,
                                this.saveAsNewReport(this.reportName)
                            this.themeModal.destroy();

                            console.log(this.reportName);
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

    public checkValid(): boolean {

        return this.fc.field.value.length > 0 ? false : true
    }


    saveAsNewReport(name: string): void {

        const getSelectedField = [];

        _.forEach(this.fc.field.value, (v, i) => {

            const found = this.selectedField[0].find(element => element.res === v);

            if (found) {

                const index = this.selectedField[0].indexOf(found);

                getSelectedField.push({
                    name: this.selectedField[0][index]['name'],
                    res: this.selectedField[0][index]['res'],
                    isSaved: true
                });
            }
        });
        const sendObj = {
            field: getSelectedField,
            type: this.fc.type.value + name,
            masterType: this.reports[0].masterType,
            name: name
        }
        console.log(sendObj);
        // const index = this.reports.indexOf(this.reports.find(element => element.reportType === this.fc.type.value));
        this._reportDependencyervice
            .saveField(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.isLoadingForm = false;
                    this._notification.clearSnackBar();
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                },
                error => {

                    this.isLoadingForm = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    public setIcon(): boolean {

        const found = this.reports.find(repo => repo.reportType === this.fc.type.value);

        if (found) {

            const index = this.reports.indexOf(found);
            return this.reports[index].isFav;
        }

    }
    public addFav(e: MouseEvent): void {

        e.preventDefault();

        if (!this.fc.type.value && !this.fc.field.value) {
            return;
        }

        this.isLoadingForm = true;

        const found = this.reports.find(repo => repo.reportType === this.fc.type.value);

        if (found) {

            const index = this.reports.indexOf(found);
            console.log(this.reports[index].id);

            this._reportDependencyervice
                .addFav(this.reports[index].id)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    message => {
                        this.isLoadingForm = false;
                        this._notification.clearSnackBar();
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    },
                    error => {

                        this.isLoadingForm = false;

                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );

        }

    }

}
