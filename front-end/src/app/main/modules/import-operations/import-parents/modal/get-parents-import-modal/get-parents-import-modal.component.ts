import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { ImportCCSEnrolmentService } from '../../../ccs-enrolments/services/import-enrolments.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import * as _ from 'lodash';
import { ImportParentService } from '../../service/import-parent.service';
import { forEach } from 'lodash';
import * as Papa from 'papaparse/papaparse.min.js';

@Component({
  selector: 'get-parents-import-modal',
  templateUrl: './get-parents-import-modal.component.html',
  styleUrls: ['./get-parents-import-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class GetParentsImportModalComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    form: FormGroup;
    buttonLoader: boolean;

    fileRecords: any[];
    fileHeaders: any[];
    enrollmentIds: any[];
    attendanceType = [
        {
            name: 'Monday, Tuesday.....',
            id: 0
        },
        {
            name: 'T, Th, W...',
            id: 1
        }
    ]

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
        private _parentImportService: ImportParentService
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

    ngOnInit() {
        this._logger.debug('get import enrollments !!!', this.organizations);

        this.onChanges();
    }

    onChanges(): void {
        // Subscribe to form value changes
        this.form
            .get('org')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => {
                this.form.get('branch').patchValue(null);

                this.branches = this.getBranches(val);
            }
            );

            this.form
            .get('kponly')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => {
                if(val === true) {
                    this.form.get('kpKconnect').disable({ emitEvent: false });
                    // this.form.get('attendance').enable({ emitEvent: false });
                }
                else{
                    // this.form.get('attendance').disable({ emitEvent: false });
                    this.form.get('kpKconnect').enable({ emitEvent: false });
                }
                
            }
            );
            this.form
            .get('kpKconnect')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => {
                if(val === true) {
                    this.form.get('kponly').disable({ emitEvent: false });
                    // this.form.get('kpKconnect').enable({ emitEvent: false });
                }
                else{
                    // this.form.get('kpKconnect').disable({ emitEvent: false });
                    this.form.get('kponly').enable({ emitEvent: false });
                }
            }
            );
    }

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
            attendanceType: new FormControl(null, []),
            type: new FormControl(false),
            attendance: new FormControl(false),
            kponly: new FormControl(false),
            kpKconnect:new FormControl(false),
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
            
            const reader = new FileReader();

            reader.readAsText(input.files[0]);

            reader.onload = () => 
            {

                this.fileRecords = Papa.parse(reader.result);
                console.log('reader.result',this.fileRecords);
                // this.fileRecords = (<string>reader.result).split(/\r\n|\n/);
                
                this.fileHeaders = this.fileRecords[0];
            };

            reader.onerror = () => 
            {
                this._notificationService.displaySnackBar('error is occurred while reading file!', NotifyType.ERROR);
            };
        } 
        else 
        {
            this._notificationService.displaySnackBar('Please import valid .csv file.', NotifyType.ERROR);

            this.fileReset();
        }
    }

    /**
     * get csv file headers
     *
     * @param {*} data
     * @returns {Array<any>}
     */
    getHeaderArray(data: any): Array<any>
    {
        const headers = (<string>data[0]).split(',');
        const headerArray = [];

        for(const item of headers)
        {
            headerArray.push(item);
        }

        return headerArray;
    }

    /**
     * get csv file content
     *
     * @param {*} csvData
     * @returns {Array<any>}
     */
    getParentsFromCSVData(csvData: any): Array<any>
    {
        console.log('csv data in function', csvData);
        
        const list = [];

        for(const record of csvData)
        {
            const rowData = [];
            let i = 0;
            
            for(const header of this.fileHeaders)
            {
                
                rowData.push({
                    'column': header,
                    'value' : record.split(',')[i] ? record.split(',')[i] : 'N/A',
                    [header]: record.split(',')[i] ? record.split(',')[i] : 'N/A'
                });
                i++;
                
            }
            list.push(rowData)
            
        }
        // remove heading
        list.shift();
        
        list.length = list.length-1;
        console.log('return data in function', list);
        return list;
    }

    /**
     * clear file input
     */
    fileReset(): void 
    {
        this.form.get('file').patchValue(null);

        this.fileRecords = [];
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
                user: [],
                // parents: this.getParentsFromCSVData(this.fileRecords),
                csvData: this.fileRecords,
                type: this.fc.type.value,
                attendance: this.fc.attendance.value,
                attendanceType: this.fc.attendanceType.value,
                kpKconnect:this.fc.kpKconnect.value,
                kponly:this.fc.kponly.value
            };

            this._logger.debug('[import parents object]', sendObj);
    
            this.buttonLoader = true;
            // this._parentImportService
            //     .update(sendObj)
            //     .pipe(
            //         takeUntil(this._unsubscribeAll),
            //         finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            //     )
            //     .subscribe(
            //         response =>
            //         {
            //             console.log('new response',response);
                        
            //             response.organization = this.fc.org.value;
            //             response.branch = this.fc.branch.value;
            //             setTimeout(() => this._notificationService.displaySnackBar(response, NotifyType.SUCCESS), 200);
    
            //             resolve(response)
            //         },
            //         errorRes => 
            //         {
            //             setTimeout(() => this._notificationService.displaySnackBar(errorRes, NotifyType.ERROR), 200);
                        
            //             reject(errorRes);
            //         }
            //     );
            
            this._parentImportService.onParentsChanged.next(sendObj);
            setTimeout(() => this.buttonLoader = false, 200)
        });
    }


}
