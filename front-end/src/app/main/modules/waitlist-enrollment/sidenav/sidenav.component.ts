import {Component, OnInit, EventEmitter, Output} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Subject} from 'rxjs';
import {Branch} from 'app/main/modules/branch/branch.model';
import {FormGroup, FormControl} from '@angular/forms';
import {NGXLogger} from 'ngx-logger';
import * as isEqual from 'fast-deep-equal';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {WaitListEnrollmentService} from '../service/waitlist-enrollment.service';
import {UrlHelper} from 'app/utils/url.helper';
import {AppConst} from 'app/shared/AppConst';
import {AuthService} from 'app/shared/service/auth.service';
import {Country} from 'app/shared/model/common.interface';
import {CountryResolverService} from '../../../common/public/waitlist/services/country-resolver.service';
import * as _ from 'lodash';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {CsvService} from 'app/shared/service/csv.service';
import {NotificationService} from 'app/shared/service/notification.service';

@Component({
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
// Private
    private _unsubscribeAll: Subject<any>;

    // branches: Branch[];
    branches: Branch[];
    showFilterButton: boolean;

    filtersForm: FormGroup;

    formDefaultValues = {
        type: '1',
        status: 4,
        priority: null,
        application_start_date: null,
        application_end_date: null,
        expected_start_date: null,
        expected_end_date: null,
        age: null,
        gender: null,
        days_waiting: null,
        sibilings: null
    };

    currenttype: any;
    type: any;
    status: any;
    priority: any;

    buttonLoader: boolean;
    siteManager: boolean = false;
    organizationId: string
    _domain: string

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;
    age: any;
    gender: any;
    number_of_days: any;
    number_of_sibilings: number[];
    selectedBranch: string = '';
    countriesList: Country[] = [];
    downloadActionPDF: boolean;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {WaitListEnrollmentService} WaitListEnrollmentService
     */
    constructor(
        private _logger: NGXLogger,
        private _waitListEnrollmentService: WaitListEnrollmentService,
        private _authService: AuthService,
        private _route: ActivatedRoute,
        private _countryResolverService: CountryResolverService,
    ) {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        if (history.state.category !== undefined && history.state.category === AppConst.appStart.WAITLIST.NAME) {
            this.selectedBranch = history.state.selectedBranch;
        }
        this.filtersForm = this.createFilterForm();
        this.buttonLoader = false;
        this.currenttype = '1';
        this.downloadActionPDF = true;
        // this.setFilterFormDefaults();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.updateFilterActiveStatus = new EventEmitter();

        this.type = [
            {
                'value': 1,
                'name': 'Enquiry',
            },
            {
                'value': 2,
                'name': 'Waitlist/Enrolment',
            }
        ]

        this.status = [
            {
                'value': 0,
                'name': 'Waitlisted',
            },
            {
                'value': 1,
                'name': 'Emailed',
            },
            {
                'value': 2,
                'name': 'Enrolled',
            },
            {
                'value': 3,
                'name': 'Active',
            }
        ]

        this.priority = [
            'Priority 1',
            'Priority 2',
            'Priority 3',
        ]

        this.age = [
            {
                'value': 0,
                'name': '< 1',
            },
            {
                'value': 1,
                'name': '1-2',
            },
            {
                'value': 2,
                'name': '3-4',
            },
            {
                'value': 3,
                'name': '5 +',
            }
        ]

        this.gender = [
            {
                'value': 0,
                'name': 'Male',
            },
            {
                'value': 1,
                'name': 'Female',
            },
        ]

        this.number_of_days = ['<=7', '<=14', '<=30', '<=60', '<=90', '>90',]

        this.number_of_sibilings = [1, 2, 3, 4, 5]
        this._domain = UrlHelper.extractTenantNameFromUrl(location.host);
    }

// -----------------------------------------------------------------------------------------------------
// @ Lifecycle hooks
// -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // this._logger.debug('side nav!!!');
        // this.getOrganizationID()
        this.siteManager = this._authService.getUserLevel() === 'owner';
        this._waitListEnrollmentService.changeBranches.subscribe((value) => {
            this.branches = value;
        });

        this._countryResolverService
            .resolve()
            .pipe()
            .subscribe((value: any) => {
                this.countriesList = value[0];
            });

        this._waitListEnrollmentService.onWaitlistPrintDataChanged.subscribe((value) => {
            if (!_.isEmpty(value.items) && value.items.length > 0) {
                if (this.downloadActionPDF) {
                    this.getCRMDownload(value)
                } else {
                    this.getCSVDownload(value)
                }

            }
        })
    }

    getCRMDownload(crm): void {
        crm.items.forEach(x => {
            this._waitListEnrollmentService.printCRM(x, this.countriesList, 'download')
        })
    }

    getCSVDownload(crm): void {
        crm.items.forEach((x, key) => {
            const fileName = (x.status === '2' || x.status === '3') ? 'Enrolment Form' : (x.status === '0' || x.status === '1') ? 'Waitlist Form' : 'Enquiry Form';
            this._waitListEnrollmentService.downLoadCsv(fileName + '_' + (key + 1) + '_' + DateTimeHelper.getUtcDate(new Date()), x, this.countriesList)
        })
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

// -----------------------------------------------------------------------------------------------------
// @ Public methods
// -----------------------------------------------------------------------------------------------------

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.filtersForm.controls;
    }

    get getFormValues(): any {
        return {
            type: this.fc.type.value,
            status: (this.fc.type.value === '2') ? this.fc.status.value : 5,
            priority: this.fc.priority.value,
            application_start_date: (this.fc.application_date.value) ? DateTimeHelper.getUtcDate(this.fc.application_date.value[0]) : null,
            application_end_date: (this.fc.application_date.value) ? DateTimeHelper.getUtcDate(this.fc.application_date.value[1]) : null,
            expected_start_date: (this.fc.expected_start_date.value) ? DateTimeHelper.getUtcDate(this.fc.expected_start_date.value[0]) : null,
            expected_end_date: (this.fc.expected_start_date.value) ? DateTimeHelper.getUtcDate(this.fc.expected_start_date.value[1]) : null,
            age: this.fc.age.value,
            gender: this.fc.gender.value,
            days_waiting: this.fc.days_waiting.value,
            sibilings: this.fc.sibilings.value,
            branch: this.fc.branch?.value !== undefined && this.fc.branch.value !== '' ? this.fc.branch.value : null,
        };
    }

    createFilterForm(): FormGroup {
        return new FormGroup({

            type: new FormControl('1'),
            status: new FormControl(4),
            priority: new FormControl(null),
            application_date: new FormControl(''),
            expected_start_date: new FormControl(''),
            age: new FormControl(null),
            gender: new FormControl(null),
            days_waiting: new FormControl(null),
            sibilings: new FormControl(null),
            branch: new FormControl(this.selectedBranch),
        });
    }

    setFilterFormDefaults(): void {
        this.filtersForm.get('type').patchValue('1', {emitEvent: false});
        this.filtersForm.get('priority').patchValue(null, {emitEvent: false});
        this.filtersForm.get('status').patchValue(4, {emitEvent: false});
        this.filtersForm.get('priority').patchValue(null, {emitEvent: false});
        this.filtersForm.get('application_date').patchValue(null, {emitEvent: false});
        this.filtersForm.get('expected_start_date').patchValue(null, {emitEvent: false});
        this.filtersForm.get('age').patchValue(null, {emitEvent: false});
        this.filtersForm.get('gender').patchValue(null, {emitEvent: false});
        this.filtersForm.get('days_waiting').patchValue(null, {emitEvent: false});
        this.filtersForm.get('sibilings').patchValue(null, {emitEvent: false});
        this.showFilterButton = false;
        this._waitListEnrollmentService.currentType = 5;
    }

    selectfields(event: string): void {
        this.currenttype = event;
    }

    checkClearFilter(): boolean {
        return isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        this._waitListEnrollmentService.onFilterChanged.next(null);
    }

    submitFilter(e: MouseEvent): void {
        e.preventDefault();
        if (!this.checkClearFilter()) {
            this._waitListEnrollmentService.onFilterChanged.next(this.getFormValues);

            this.updateFilterActiveStatus.emit(true);
        }
    }

    downloadPdf(e: MouseEvent, action: boolean): void {
        this.downloadActionPDF = action;
        this._waitListEnrollmentService.onPaginationChanged.next(1000)
    }
}