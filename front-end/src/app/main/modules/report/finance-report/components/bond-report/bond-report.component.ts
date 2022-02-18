import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FinanceReportservice } from '../../../service/finance-report.service';
import * as _ from 'lodash';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { NGXLogger } from 'ngx-logger';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { User } from 'app/main/modules/user/user.model';
import { Room } from 'app/main/modules/room/models/room.model';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { finalize, takeUntil } from 'rxjs/operators';
import { ReportDependencyervice } from '../../../service/report-dependencey.service';

@Component({
    selector: 'app-bond-report',
    templateUrl: './bond-report.component.html',
    styleUrls: ['./bond-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BondReportComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    @Input() reportType: string;

    filterForm: FormGroup;
    userList: User[];
    buttonLoader: boolean;
    buttonLoaderDownload: boolean;
    reportData: any;
    roomList: Room[];

    filterBy = [
        {
            index: 'PARENT',
            name: 'Parent'
        },
        {
            index: 'ROOM',
            name: 'Room'
        }
    ];

    constructor(
        private _financeReportService: FinanceReportservice,
        private _fuseSidebarService: FuseSidebarService,
        private _logger: NGXLogger,
        private _reportDependencyervice: ReportDependencyervice
    ) {

        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
        this.buttonLoaderDownload = false;

        this.filterForm = this.createFilterForm();
        this.reportData = [];

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        this._financeReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report-data]', response);
                this.reportData = response.records ? response.records : [];
            });

        this._financeReportService
            .onUserAccountsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((financeAccount: User[]) => {
                this._logger.debug('[report filter view]', financeAccount);
                this.filterForm.get('user').reset();
                this.userList = financeAccount;
            });

        this.filterForm.get('sdate')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.startDateHandler(value);
            });

        this._reportDependencyervice
            .onRoomChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: any) => {
                this._logger.debug('[rooms-list]', rooms);
                this.roomList = rooms.items;
            });

        this.filterForm
            .get('filterBy')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this.filterByHandler(value);
            });

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number {
        return index;
    }

    get fc(): any {
        return this.filterForm.controls;
    }

    get getFormValues(): any {
        return {
            user: this.fc.user.value,
            type: this.fc.type.value,
            sdate: DateTimeHelper.getUtcDate(this.fc.sdate.value),
            edate: DateTimeHelper.getUtcDate(this.fc.edate.value),
            filterBy: this.fc.filterBy.value,
            room: this.fc.room.value,
            status_toggle: this.fc.status_toggle.value,
        };
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    toggleSelectAllUser(value: boolean): void {

        if (value === true) {
            this.filterForm.get('user').patchValue(_.map(this.userList, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('user').patchValue([], { emitEvent: false });
        }

    }

    toggleSelectAllRooms(value: boolean): void {

        if (value === true) {
            this.filterForm.get('room').patchValue(_.map(this.roomList, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('room').patchValue([], { emitEvent: false });
        }

    }

    startDateHandler(value: any): void {

        if (value) { 
            
            const endDateControl = this.filterForm.get('edate');
    
            if (endDateControl.value && DateTimeHelper.parseMoment(value).isSameOrAfter(DateTimeHelper.parseMoment(endDateControl.value))) {
                endDateControl.reset();
            }

        }

    }

    disabledEndDate = (date: Date): boolean => {
        return differenceInCalendarDays.default(date, this.fc.sdate.value) <= 0;
    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            type: new FormControl(this.reportType),
            user: new FormControl(null, [Validators.required]),
            room: new FormControl(null, [Validators.required]),
            sdate: new FormControl(null, [Validators.required]),
            edate: new FormControl(null, [Validators.required]),
            filterBy: new FormControl(null, [Validators.required]),
            status_toggle: new FormControl(null)
        });
    }

    filterByHandler(value: any): void {

        this._logger.debug('[filter value change]', value);

        if (!_.isNull(value)) {

            if (value === 'ROOM') {
                this.filterForm.get('room').setValidators([Validators.required]);
                this.filterForm.get('user').clearValidators();
                this.filterForm.get('room').updateValueAndValidity();
                this.filterForm.get('user').updateValueAndValidity();
            }
            else {
                this.filterForm.get('user').setValidators([Validators.required]);
                this.filterForm.get('room').clearValidators();
                this.filterForm.get('room').updateValueAndValidity();
                this.filterForm.get('user').updateValueAndValidity();
            }

        }

    }

    submitReport(event: MouseEvent, view: boolean, isPdf: boolean): void {

        event.preventDefault();

        if (this.filterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;
  
        this._logger.debug('[send object]', sendObj);

        this.buttonLoader = true;

        this._financeReportService
            .getBondReportData(sendObj, this.fc.type.value, view, isPdf)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe();

    }
    
}
