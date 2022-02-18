import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { finalize } from 'rxjs/internal/operators/finalize';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { Papa } from 'ngx-papaparse';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ImportBookingService } from '../../services/import-bookings.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Branch } from 'app/main/modules/branch/branch.model';

@Component({
    selector: 'get-import-bookings',
    templateUrl: './get-import-bookings.component.html',
    styleUrls: ['./get-import-bookings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class GetImportBookingsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    form: FormGroup;
    buttonLoader: boolean;

    fileRecords: any[];
    fileHeaders: any[];
    enrollmentIds: any[];

    branches: Branch[];

    @Input() organizations: Organization[];

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
        private _bookingImportService: ImportBookingService,
        private _csvParser: Papa
    )
    {
        // set default values
        this.buttonLoader = false;
        this.fileRecords = [];
        this.fileHeaders = [];
        this.enrollmentIds = [];
        this.branches = [];

        this.form = this.createForm();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('get import bookings !!!', this.organizations);

        this.onChanges();
    }

    onChanges(): void
    {
        // Subscribe to form value changes
        this.form
            .get('org')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => 
                {
                    this.form.get('branch').patchValue(null);

                    this.branches = this.getBranches(val);
                }
            );
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
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
    get fc(): any 
    { 
        return this.form.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            org: new FormControl(null, [Validators.required]),
            branch: new FormControl(null, [Validators.required]),
            file: new FormControl(null, [Validators.required]),
            column_child_crn: new FormControl(null, [Validators.required]),
            column_child_dob: new FormControl(null, [Validators.required]),
            column_week_schedule: new FormControl(null, [Validators.required]),
            column_enrolment_start: new FormControl(null, [Validators.required]),
            column_enrolment_end: new FormControl(null, [Validators.required]),
            column_fee: new FormControl(null, [Validators.required]),
            column_room: new FormControl(null, [Validators.required]),
            include_history: new FormControl(false),
        });
    }

    /*------------------------------------------------------*/

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * is file extraction is csv
     *
     * @param {*} file
     * @returns {boolean}
     */
    isValidFile(file: any): boolean 
    {
        return file.name.endsWith('.csv');
    }

    /**
     * file listener
     *
     * @param {*} $event
     * @returns {void}
     */
    fileInputListener($event: any): void 
    {
        const files = $event.srcElement.files;

        if(files.length < 1)
        {
            this.fileReset();

            return;
        }

        if (this.isValidFile(files[0])) 
        {
            const input = $event.target;

            this._csvParser.parse(input.files[0], 
            {
                header: true,
                worker: true,
                skipEmptyLines: true,
                fastMode: true,
                complete: (results: any) => 
                {
                    this.fileRecords = results.data;
                    
                    this.fileHeaders = results.meta.fields;
                },
                error: (error) => 
                {
                    console.error(error);

                    this._notificationService.displaySnackBar('error is occurred while reading file!', NotifyType.ERROR);
                }
            });
        } 
        else 
        {
            this._notificationService.displaySnackBar('Please import valid .csv file.', NotifyType.ERROR);

            this.fileReset();
        }
    }

    /**
     * clear file input
     */
    fileReset(): void 
    {
        this.form.get('file').patchValue(null);
        this.form.get('column_child_crn').patchValue(null);
        this.form.get('column_child_dob').patchValue(null);
        this.form.get('column_week_schedule').patchValue(null);
        this.form.get('column_enrolment_start').patchValue(null);
        this.form.get('column_enrolment_end').patchValue(null);
        this.form.get('column_fee').patchValue(null);
        this.form.get('column_room').patchValue(null);

        this.fileRecords = [];
        this.fileHeaders = [];
    }

    /**
     * get branch from selected organization
     *
     * @param {string} value
     * @returns {any}
     */
    getBranches(value: string): any
    {
        return (value && !_.isEmpty(this.organizations.find(i => i.id === value))) ? this.organizations.find(i => i.id === value).branch : [];
    }

    /**
     * get enrollments from api 
     *
     * @returns {Promise<any>}
     */
    getBookings(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            if (this.form.invalid)
            {
                return;
            }
    
            const sendObj = {
                org: this.fc.org.value,
                branch: this.fc.branch.value,
                bookings: _.map(this.fileRecords, i => 
                    {
                        return { 
                            ...{ f_name: _.head(Object.values(_.pick(i, this.fileHeaders[0]))) },
                            ...{ l_name: _.head(Object.values(_.pick(i, this.fileHeaders[1]))) },
                            ...{ crn: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_child_crn.value]))) },
                            ...{ dob: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_child_dob.value]))) },
                            ...{ week_schedule: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_week_schedule.value]))) },
                            ...{ enrolment_start: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_enrolment_start.value]))) },
                            ...{ enrolment_end: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_enrolment_end.value]))) },
                            ...{ fee: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_fee.value]))) },
                            ...{ room: _.head(Object.values(_.pick(i, this.fileHeaders[+this.fc.column_room.value]))) },
                        }
                    }),
                history: this.fc.include_history.value
            };
            
            this._logger.debug('[import booking object]', sendObj);

            this.buttonLoader = true;
    
            this._bookingImportService
                .getBookings(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this.buttonLoader = false, 200))
                )
                .subscribe(
                    response =>
                    {
                        response.organization = this.fc.org.value;
                        response.branch = this.fc.branch.value;
                        response.csvData = sendObj.bookings;
                        response.history = this.fc.include_history.value;
    
                        resolve(response);
                    },
                    errorRes => 
                    {
                        setTimeout(() => this._notificationService.displaySnackBar(errorRes.error.message, NotifyType.ERROR), 200);
                        
                        reject(errorRes);
                    }
                );
        });
    }
}
