import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Child } from 'app/main/modules/child/child.model';
import { FinanceService } from 'app/main/modules/finance/shared/services/finance.service';
import { ImmunisationSchedule } from 'app/main/modules/immunisation/model/immunisation-schedule.model';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize, debounceTime } from 'rxjs/operators';
import { ImmunisationReportservice } from '../../service/immunisation-report.service';

export interface ImmunisationReportType {
    value: string;
    name: string;
}

@Component({
    selector: 'immunisation-report-filter',
    templateUrl: './immunisation-report-filter.component.html',
    styleUrls: ['./immunisation-report-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationReportFilterComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    children: Child[];
    selectedChild: Child[];
    room: Room[];
    immunisation: Immunisation[];
    buttonLoader: boolean;
    buttonLoaderDownload: boolean;
    loadingChildren: boolean;
    reportTypes: ImmunisationReportType[];
    viewLoading: boolean;
    schedule: ImmunisationSchedule[];

    filterForm: FormGroup;
    constructor(
        private _logger: NGXLogger,
        private _immunisationReportService: ImmunisationReportservice,
        private _financialService: FinanceService
    ) {
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
        this.buttonLoaderDownload = false;
        this.children = [];
        this.selectedChild = [];
        this.viewLoading = false;
        this.filterForm = this.createFilterForm();
        this.reportTypes = this._immunisationReportService.getReportTypes();
        this.schedule = [];
    }

    ngOnInit() {

        this._immunisationReportService
            .onchildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((children: Child[]) => {
                this._logger.debug('[report filter view]', children);
                // this.children = children;
            });

            this._immunisationReportService
            .onRoomChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: Room[]) => {
                this._logger.debug('[report filter view]', rooms);
                this.room = rooms;
            });

            this._immunisationReportService
            .onImmunisationListChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((immunisation: Immunisation[]) => {
                this._logger.debug('[report filter view]', immunisation);
                this.immunisation = immunisation;
            });

            this._immunisationReportService
            .onImmunisationScheduleChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((schedule: ImmunisationSchedule[]) => {

                this.schedule = schedule;
            });

            // Subscribe to table loader
        this._immunisationReportService
        .onTableLoaderChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((value: boolean) => {
            this._logger.debug('[table loader]', value);

            this.viewLoading = value;
        });

        this.filterForm
        .get('type')
        .valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(value => {
            this._logger.debug('[type value change]', value);
            if (!_.isNull(value)) {
                if(value === 'MEDI_CIMR') {
                    this.filterForm.get('schedule').setValidators([Validators.required]);
                }
                else{
                    this.filterForm.get('schedule').clearAsyncValidators();
                }
                this.filterForm.get('schedule').updateValueAndValidity();

                this._immunisationReportService.unsubscribeOptions();
            }
        });
        this.filterForm.get('room').valueChanges
            .pipe(
                debounceTime(1000)
            )
            .subscribe((value) => {

                this.loadChildren(value, true);

            });

        this.filterForm.get('inactive_children').valueChanges
            .pipe(
                debounceTime(200)
            )
            .subscribe((value) => {

                this.loadChildren(this.filterForm.get('room').value, true);
            });

    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            child: new FormControl(null, [Validators.required]),
            room: new FormControl(null, [Validators.required]),
            type: new FormControl(null, [Validators.required]),
            immunisation: new FormControl(null, [Validators.required]),
            inactive_children: new FormControl(false),
            schedule: new FormControl(null, []),
        });
    }

    get fc(): any {
        return this.filterForm.controls;
    }

    get getFormValues(): any {
        return {
            room:this.fc.room.value,
            child: this.fc.child.value,
            type: this.fc.type.value,
            immunisation: this.fc.immunisation.value,
            schedule: this.fc.schedule.value
        };
    }

    loadChildren(value: any, room: boolean): void {

        const childrenControl = this.filterForm.get('child');
        const inactiveChildren = this.filterForm.get('inactive_children').value;

        childrenControl.disable();

        if (_.isEmpty(value)) {
            childrenControl.reset();
            return;
        }

        this.loadingChildren = true;

        this._financialService
            .getFinancialAdjustmentChildrenList((room === true ? value : null), (room === false ? value : null), inactiveChildren)
            .pipe(
                finalize(() => {
                    this.loadingChildren = false;
                    childrenControl.enable();
                    childrenControl.reset();
                })
            )
            .subscribe((response) => {
                this.children = response;
            });

    }

    submitReport(event: MouseEvent, isPdf: boolean): void { 

        event.preventDefault();

        if (this.filterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;

        this._logger.debug('[send object]', sendObj);

        if (this.fc.type.value === AppConst.ImmunisationReportTypes.IMMUNISATION_REPORT) {

            this._immunisationReportService
                .geImmunisationReportData(sendObj, isPdf);

        }
             if (this.fc.type.value === AppConst.ImmunisationReportTypes.IMMUNISATION_MATRIX_REPORT) {

            this._immunisationReportService
                .geImmunisationMatrixReportData(sendObj, isPdf);

        }


    }

    toggleSelectAllChild(value: boolean): void {

        if (value === true) {
            this.filterForm.get('child').patchValue(_.map(this.children, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('child').patchValue([], { emitEvent: false });
        }

    }

    toggleSelectAllImmunisation(value: boolean): void {

        if (value === true) {
            this.filterForm.get('immunisation').patchValue(_.map(this.immunisation, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('immunisation').patchValue([], { emitEvent: false });
        }

    }
    
    toggleSelectAllRoom(value: boolean): void {

        if (value === true) {

            this.filterForm.get('room').patchValue(_.map(this.room, 'id'), { emitEvent: false });
        } else {

            this.filterForm.get('room').patchValue([], { emitEvent: false });
        }

        this.loadChildren(this.filterForm.get('room').value, true);

    }

    trackByFn(index: number, item: any): number {
        return index;
    }
}
