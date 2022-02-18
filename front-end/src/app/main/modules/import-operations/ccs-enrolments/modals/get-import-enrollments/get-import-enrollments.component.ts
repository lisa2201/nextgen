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

import { ImportCCSEnrolmentService } from '../../services/import-enrolments.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Branch } from 'app/main/modules/branch/branch.model';

@Component({
    selector: 'get-import-enrollments',
    templateUrl: './get-import-enrollments.component.html',
    styleUrls: ['./get-import-enrollments.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class GetImportEnrollmentsComponent implements OnInit, OnDestroy {

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
     * @param {NotificationService} _notificationService
     * @param {ImportCCSEnrolmentService} _enrolmentImportService
     * @param {Papa} _csvParser
     * @memberof GetImportEnrollmentsComponent
     */
    constructor(
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
        private _enrolmentImportService: ImportCCSEnrolmentService,
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
        this._logger.debug('get import enrollments !!!', this.organizations);

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
            column: new FormControl(null, [Validators.required])
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
    getEnrollments(): Promise<any>
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
                enrollments: _.map(this.fileRecords, this.fileHeaders[+this.fc.column.value]),
            };
    
            this._logger.debug('[import enrolment object]', sendObj);
    
            this.buttonLoader = true;
    
            this._enrolmentImportService
                .getEnrollments(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this.buttonLoader = false, 200))
                )
                .subscribe(
                    response =>
                    {
                        response.organization = this.fc.org.value;
                        response.branch = this.fc.branch.value;
                        response.csvData = sendObj.enrollments;
    
                        resolve(response)
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
