import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation, fadeOutCollapseOnLeaveAnimation } from 'angular-animations';
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
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { ReportDependencyervice } from '../../service/report-dependencey.service';
import { ReportModel } from '../../model/report.model';
import { AppConst } from 'app/shared/AppConst';
@Component({
    selector: 'report-filter',
    templateUrl: './report-filter.component.html',
    styleUrls: ['./report-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ReportFilterComponent implements OnInit, OnDestroy {

    themeModal: NzModalRef;
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

    defaultSelectedField: any = [];
    saveDefaultSelectedField: any = [];
    selectedField: any;
    @ViewChild('htmlData') htmlData:ElementRef;
    private _unsubscribeAll: Subject<any>;

    reportName:string;
    reports: ReportModel[];
    childStatus: string;
    childList: Child[];
    defaultChildren: Child[];
    roomList: Room[];
    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;
    buttonLoaderDownload: boolean;
    filterByChild: boolean;
    size: number;
    isLoadingForm: boolean;
    isChildEmergencyContactAndParentReportSelected: boolean;
    primaryPayerReport: string;
    reportType: string;

    FilterForm: FormGroup;
    constructor(
        private _logger: NGXLogger,
        private _contactReportService: ContactReportservice,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _reportDependencyervice:ReportDependencyervice
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.filterByChild = true;
        this.size = 4;
        this.isLoadingForm = false;
        // this.selectedField = this.PACDR;
        // this.defaultSelectedField = _.map(this.selectedField, (i) => i.value);
        this.FilterForm = this.createFilterForm();
        this.childStatus = '1';
        this.isChildEmergencyContactAndParentReportSelected = false;
        this.primaryPayerReport = AppConst.ContactReportTypes.IPRIMARY_PAYER_REPORT;
        this.reportType = '';

    }

    ngOnInit(): void {
        this.FilterForm.get('filterBy').patchValue('CHILD');
        this.FilterForm.get('sortby_toggle').patchValue('first_name');

        this._reportDependencyervice
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report filter view]', response);

                this.defaultChildren = response.items;
                this.childList = _.filter(this.defaultChildren, (child)=> child.status === '1');
            });

            this._reportDependencyervice
            .onReportFieldChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((report: ReportModel[]) => {
                this._logger.debug('[report data new]', report);
                this.reports = report;
                this.FilterForm.get('type').patchValue(_.filter(this.reports, (repo)=> repo.isFav === true? repo.isFav === true : repo.isFav === false)[0].reportType);
                this.setSelectedField(this.fc.type.value)
                this.fc.type.value === 'CCR' ? this.FilterForm.get('include_type').enable() : this.FilterForm.get('include_type').disable()

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
                    this.isLoadingForm  = true;
                    
                    this.validateArrangementType(value)

                    if (value === 'CHILD') {
                        this.filterByChild = true;
                    }
                    else {
                        this._reportDependencyervice
                            .onRoomChanged
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe((rooms: any) => {
                                this._logger.debug('[rooms-list]', rooms);
                                this.roomList = rooms.items;
                            });
                        this.filterByChild = false;
                        // this.branchForm.get('service').patchValue(null, { emitEvent: false });
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
                this._logger.debug('[report type value change]', value);
                this._contactReportService.unsubscribeOptions();
                if (!_.isNull(value)) {
                    // this.setDefaultSelectedField(value);
                    this.reportType = value;
                    this.isLoadingForm = true;
                    this.setSelectedField(value);
                    setTimeout(() => this.isLoadingForm = false, 500);
                }
                else {
                    // this.selectedServices = [];
                }

                setTimeout(() => this.isLoadingForm = false, 1500);

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
            status_toggle : this.fc.status_toggle.value,
            sortby_toggle : this.fc.sortby_toggle.value,
            include_type: this.fc.include_type.value,
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
            sortby_toggle : new FormControl(false),
            include_type: new FormControl(false)

        });
    }

    setSelectedField(value): void {
        console.log(value);
        if(value === AppConst.ContactReportTypes.IPRIMARY_PAYER_REPORT){
            this.FilterForm.get('field').clearValidators();
            this.FilterForm.get('field').reset();
            this.FilterForm.get('field').disable();
            this.FilterForm.get('field').updateValueAndValidity();
            
        }
        // else{

        //     this.FilterForm.get('field').setValidators([Validators.required]);
        //     this.FilterForm.get('field').enable();
        //     this.FilterForm.get('field').updateValueAndValidity();
        // }
        if (value === 'CCR') {
            this.FilterForm.get('field').clearValidators();
            this.FilterForm.get('field').reset();
            this.FilterForm.get('field').updateValueAndValidity();
            this.isChildEmergencyContactAndParentReportSelected = true;

                this.FilterForm.get('include_type').enable();
        }
        else {
            this.FilterForm.get('field').setValidators([Validators.required]);
            this.FilterForm.get('field').updateValueAndValidity();
            this.isChildEmergencyContactAndParentReportSelected = false;
            this.FilterForm.get('include_type').disable();
        }
        this.selectedField = (_.map(_.filter(this.reports, (val) => val.reportType === value), 'field'));
        console.log(this.selectedField);
        
        this.defaultSelectedField = _.map(this.selectedField[0], (i) => i.res);
        this.saveDefaultSelectedField = _.map(_.filter(this.selectedField[0], (i) => i.isSaved === true), 'res');
        this._logger.debug('[saveDefaultSelectedField 1st]', this.saveDefaultSelectedField);
        this.FilterForm.get('field').patchValue(this.saveDefaultSelectedField.length > 0 ? this.saveDefaultSelectedField : this.defaultSelectedField.slice(0, 4));
    } 

    saveField(e: MouseEvent): void {
        e.preventDefault();

        this.isLoadingForm = true;
        const getSelectedField = [];

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


    viewReport(e: MouseEvent): void{
        e.preventDefault();

        if (this.FilterForm.invalid)
        {
            return;
        }

        const sendObj = this.getFormValues;

        this._logger.debug('[branch object]', sendObj);

        this.buttonLoader = true;

        const getSelectedField = [];

        // _.forEach(this.fc.field.value, (v, i) => {

        //     const found = this.selectedField.find(element => element.value === v);

        //     if (found) {
        //         const index: number = this.selectedField.indexOf(found);
        //         console.log('index', index);
                
        //         getSelectedField.push({
        //             name: this.selectedField[index]['name'],
        //             value: this.selectedField[index]['value'],
        //             res: this.selectedField[index]['res']
        //         });
        //     }
            
        // });

        console.log('getSelectedField', getSelectedField);

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

        if(this.fc.type.value === AppConst.ContactReportTypes.IPRIMARY_PAYER_REPORT){

            this._contactReportService
            .viewPrimaryPayerReports(sendObj, true, false)
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
        else{
            this._contactReportService
            .viewReports(sendObj, getSelectedField)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();
    
                    // setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

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

    downloadPdf(e: MouseEvent, isPdf): void{

        e.preventDefault();
        if (this.FilterForm.invalid)
        {
            return;
        }

        if (this.fc.field.value.length > 10  && isPdf)
        {
             setTimeout(() => this._notification.displaySnackBar('Only 6 fields are displayed in the PDF. CSV export will print all the selected fields', NotifyType.WARNING), 200);
             return
        }
        const getSelectedField = [];

        const sendObj = this.getFormValues;

        this._logger.debug('[report object]', sendObj);

        this.buttonLoaderDownload = true;

        if(this.fc.type.value === AppConst.ContactReportTypes.IPRIMARY_PAYER_REPORT){

            this._contactReportService
            .viewPrimaryPayerReports(sendObj, false, isPdf)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    this.buttonLoaderDownload = false;
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

                },
                error => {

                    this.buttonLoaderDownload = false;
                    this.buttonLoader = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
        }

        else{

    
            _.forEach(this.fc.field.value, (v, i) => {
    
                const found = this.selectedField[0].find(element => element.res === v);
    
                if (found) {
                    const index: number = this.selectedField[0].indexOf(found);
                    console.log('index', index);
    
                        getSelectedField.push({
                            name: this.selectedField[0][index]['name'],
                            res: this.selectedField[0][index]['res']
                        });
                }
    
            });
    
            let report = _.find(this.reports, ['reportType', this.fc.type.value]);
            console.log('getSelectedField', getSelectedField);
    
            // Child Contact report doesn't have a saved report in db, manually set it.
            if(this.fc.type.value==='CCR')
            {
                report = {
                    'id': 'x',
                    'name': 'Child Contacts Report',
                    'masterType': 'CON',
                    'reportType': 'CCR',
                    'field': [
                        {
                            'name': 'Child Name',
                            'res': 'firstName',
                            'isSaved': false
                        },
                        {
                            'name': 'Relation',
                            'res': 'relationshipE',
                            'isSaved': false
                        },
                        {
                            'name': 'Contact',
                            'res': 'eFirstName',
                            'isSaved': false
                        },
                        {
                            'name': 'Home',
                            'res': 'phoneNumberE',
                            'isSaved': false
                        },
                        {
                            'name': 'Mobile',
                            'res': 'MobileNumberE',
                            'isSaved': false
                        },
                        {
                            'name': 'Work',
                            'res': 'workPhoneNumberE',
                            'isSaved': false
                        },
                        {
                            'name': 'Email',
                            'res': 'emailE',
                            'isSaved': false
                        },
                        {
                            'name': 'Call Order',
                            'res': 'call_order',
                            'isSaved': false
                        }
                    ],
                    'isFav': false,
                    'isDefault': true,
                    'index': 3
                };
            }
            this._contactReportService
                .getDataForReport(sendObj, getSelectedField,isPdf, report)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    message => {
                        this.buttonLoaderDownload = false;
                        this.isLoadingForm = false;
                        this._notification.clearSnackBar();
        
                        // setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
    
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

    toggleSelectAllRooms(value: boolean): void {

        if (value === true) {
            this.FilterForm.get('room').patchValue(_.map(this.roomList, 'id'), { emitEvent: false });
            // this.loadChildren(_.map(this.rooms, 'id'));
        } else {
            this.FilterForm.get('room').patchValue([], { emitEvent: false });
            // this.loadChildren([]);
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

    }

    getChildren(value: string): void {

        this.isLoadingForm = true;
        this.childStatus = value;
        this.FilterForm.get('child').patchValue([], { emitEvent: false });

        if(value !== '2') {
            this.childList = _.filter(this.defaultChildren, (child)=> child.status === value);
        }
        else{
            this.childList = this.defaultChildren;
        }
        setTimeout(() => this.isLoadingForm = false, 500);

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

    public openPDF():void {
        
        const DATA = this.htmlData.nativeElement;
        const doc = new jsPDF('p','pt', 'a4');
        doc.fromHTML(DATA.innerHTML,15,15);
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
                    type: '',
                    name: ''
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
        // return false;
    }

    
    public saveAsNewReport(name: string): void {

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
            type:this.fc.type.value + name,
            masterType:this.reports[0].masterType,
            name: name
        }

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
