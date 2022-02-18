import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, Inject } from '@angular/core';
import { FormGroup, AbstractControl, FormControl, Validators, FormArray } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { ChildAttendanceService } from 'app/main/modules/child/attendance/services/attendance.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { Child } from 'app/main/modules/child/child.model';
import { Attendance } from 'app/main/modules/child/attendance/attendance.model';
import { AuthClient } from 'app/shared/model/authClient';

import endOfWeek  from 'date-fns/endOfWeek';
import startOfWeek from 'date-fns/startOfWeek';
import startOfMonth from 'date-fns/startOfMonth';
import endOfMonth from 'date-fns/endOfMonth';
import addMonths from 'date-fns/addMonths';

import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ConvertNumberToTimeStringPipe } from 'app/shared/pipes/convert-number-to-12-hours.pipe';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';


@Component({
    selector: 'children-attendance-report',
    templateUrl: './attendance-report.component.html',
    styleUrls: ['./attendance-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        ConvertNumberToTimeStringPipe
    ],
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildrenAttendanceReportComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    action: typeof AppConst.modalUpdateTypes;
    dialogTitle: string;
    bookingForm: FormGroup;
    buttonLoader: boolean;

    children: Child[];
    client: AuthClient;
    batchTypeOptions: Array<any> = [
        {
            name: 'Day Selection',
            value: '0'
        },
        {
            name: 'Week Selection',
            value: '1'
        },
        {
            name: 'Custom Selection',
            value: '2'
        }
    ]

    dateRanges: any = {
        'Today': [new Date(), new Date()],
        'This Week': [startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })],
        'This Month': [startOfMonth(new Date()), endOfMonth(new Date())],
        '3 Months': [startOfMonth(new Date()), addMonths(endOfMonth(new Date()), 3)],
    };

    preview: boolean;
    previewData: Attendance[];
    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    previewBookingSlotErrorStatus: string;

    dialogRef: any;
    confirmModal: NzModalRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {MatDialogRef<ChildrenAttendanceReportComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {MatDialog} _matDialog
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {ChildAttendanceService} _attendanceService
     * @param {ConvertNumberToTimeStringPipe} _convertTimeString
     * @param {PDFHelperService} _pdfService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildrenAttendanceReportComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _attendanceService: ChildAttendanceService,
        private _convertTimeString: ConvertNumberToTimeStringPipe,
        private _pdfService: PDFHelperService,
        private _sanitizer: DomSanitizer,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.children = this._data.children;
        this.client = this._authService.getClient();

        this.action = this._data.action;
        this.dialogTitle = 'Attendances Report';
        this.buttonLoader = false;

        this.preview = false;
        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.bookingForm = this.createBookingForm();

        this.setTypeDefaultValue();

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
        this._logger.debug('children - attendance report !!!');

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.bookingForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.onTypeChange(value));

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.confirmModal)
        {
            this.confirmModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * update page scroll
     */
    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.bookingForm.controls;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createBookingForm(): FormGroup
    {
        return new FormGroup({
            type: new FormControl(null, [Validators.required]),
            // children: new FormControl(null, [Validators.required]),
            date: new FormControl('', [Validators.required]),
            week: new FormControl('', [Validators.required]),
            range: new FormControl('', [Validators.required]),
        });
    }

    /**
     * set default value
     */
    setTypeDefaultValue(): void
    {
        this.bookingForm.get('type').patchValue('0', { emitEvent: false });

        this.bookingForm.get('type').markAsTouched();

        setTimeout(() => this.bookingForm.get('type').updateValueAndValidity());
    }

    /**
     * validate on type change [date|week]
     *
     * @param {*} value
     */
    onTypeChange(value: any): void
    {
        // clear validation
        this.bookingForm.get('date').clearValidators();
        this.bookingForm.get('date').patchValue(null, { emitEvent: false });

        this.bookingForm.get('week').clearValidators();
        this.bookingForm.get('week').patchValue(null, { emitEvent: false });

        this.bookingForm.get('range').clearValidators();
        this.bookingForm.get('range').patchValue(null, { emitEvent: false });

        if(value === '0')
        {
            this.bookingForm.get('date').setValidators([Validators.required]);
            this.bookingForm.get('date').updateValueAndValidity();
        }
        else if(value === '1')
        {
            this.bookingForm.get('week').setValidators([Validators.required]);
            this.bookingForm.get('week').updateValueAndValidity();
        }
        else
        {
            this.bookingForm.get('range').setValidators([Validators.required]);
            this.bookingForm.get('range').updateValueAndValidity();
        }
    }

    /**
     * set base64 image source
     *
     * @param {string} value
     * @returns {*}
     */
    getBase64Image(value: string): any
    {
        return this._sanitizer.bypassSecurityTrustResourceUrl(value);
    }

    /*--------------------------------------------------------*/

    /**
     * get preview label
     *
     * @returns {{ start :string, end: string }}
     */
    getPreviewLabel(): { start :string, end: string }
    {
        let start = null;
        let end = null;

        switch (this.fc.type.value)
        {
            case '0':
                start = DateTimeHelper.getUtcDate(this.fc.date.value);
                break;

            case '1':
                start = DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD');
                end = DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD');
                break;

            default:
                start = DateTimeHelper.getUtcDate(_.head(this.fc.range.value));
                end = DateTimeHelper.getUtcDate(_.last(this.fc.range.value));
                break;
        }

        return {
            start: start,
            end: end
        }
    }

    /**
     * preview attendance dates
     *
     * @param {MouseEvent} e
     */
    previewSlots(e: MouseEvent): void
    {
        e.preventDefault();

        const sendObj: { children: string[], start: string, end: string } = {
            children: this.children.map(i => i.id),
            start: null,
            end: null
        };

        if(this.fc.type.value === '0')
        {
            sendObj['start'] = DateTimeHelper.getUtcDate(this.fc.date.value);
        }
        else if(this.fc.type.value === '1')
        {
            sendObj['start'] = DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD');
            sendObj['end'] = DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD');
        }
        else
        {
            sendObj['start'] = DateTimeHelper.parseMoment(_.head(this.fc.range.value)).format('YYYY-MM-DD');
            sendObj['end'] = DateTimeHelper.parseMoment(_.last(this.fc.range.value)).format('YYYY-MM-DD');
        }

        this._logger.debug('[preview booking request]', sendObj);

        this.buttonLoader = true;

        this._attendanceService
            .getAttendanceByChildren(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) { return; }

                    this.previewData = response;

                    this.preview = true;

                    setTimeout(() =>
                    {
                        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);

                        this.updateScroll();
                    });
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * close booking preview view
     *
     * @param {MouseEvent} e
     */
    closePreview(e: MouseEvent): void
    {
        e.preventDefault();

        setTimeout(() =>
        {
            this.preview = false;

            this.previewData = [];
            this.previewBookingSlotErrorStatus = '';
            this.isAllPreviewDataChecked = false;
            this.isPreviewIndeterminate = false;

            this.updateScroll();
        }, 0);
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.bookingForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.preview = false;
        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.setTypeDefaultValue();
    }

    getColumnHeaderWidth(): any
    {
        return [
            'auto',
            120,
            'auto',
            'auto',
            'auto',
            100,
            'auto',
            'auto',
            'auto',
            100,
        ]
    }

    /**
     * get attendance content for print
     *
     * @returns {Array<any>}
     */
    getPrintViewContent(): Array<any>
    {
        const data: Array<any> = [];

        // add headers
        data.push([
            { text: 'Date', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Child', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign In User', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign In Time', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign In Notes', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign In Signature', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign Out User', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign Out Time', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign Out Notes', color: '#ffffff', fillColor: '#009fe9' },
            { text: 'Sign Out Signature', color: '#ffffff', fillColor: '#009fe9' }
        ])

        // add rows
        for(const item of this.previewData)
        {
            data.push([
                item.date,
                item.child.getFullName(),
                (item.type === '1')? 'Absent': ((item.checkInParent) ? item.checkInParent.getFullName()  : ((item.checkInUser)? item.checkInUser.getFullName() : 'N/A')),
                (item.type === '1')? 'Absent': ((item.parentCheckInTime) ? this._convertTimeString.transform(item.parentCheckInTime)  : ((item.checkInTime)? this._convertTimeString.transform(item.checkInTime) : 'N/A')),
                (item.type === '1')? 'Absent': (item.checkInNote || 'N/A'),
                (item.type === '1')? 'Absent': (item.checkInSignature ? { image: item.checkInSignature, width: 100 } : 'N/A'),
                (item.type === '1')? 'Absent': ((item.checkOutParent) ? item.checkOutParent.getFullName()  : ((item.checkOutUser)? item.checkOutUser.getFullName() : 'N/A')),
                (item.type === '1')? 'Absent': ((item.parentCheckOutTime) ? this._convertTimeString.transform(item.parentCheckOutTime)  : ((item.checkOutTime)? this._convertTimeString.transform(item.checkOutTime) : 'N/A')),
                (item.type === '1')? 'Absent': (item.checkOutNote || 'N/A'),
                (item.type === '1')? 'Absent': (item.checkOutSignature ? { image: item.checkOutSignature, width: 100 } : 'N/A'),
            ]);
        }

        return data;
    }

    /**
     * print attendance pdf
     *
     * @param {MouseEvent} e
     */
    print(e: MouseEvent, option: string = 'open'): void
    {
        e.preventDefault();

        if (this.bookingForm.invalid || this.previewData.length < 1)
        {
            return;
        }

        const pageTitle = 'Attendance Report';
        const pageType = 'A4';
        const isLandscape = true;

        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: 'Date: ' + (this.fc.type.value === '0' ? this.getPreviewLabel().start : `${this.getPreviewLabel().start} to ${this.getPreviewLabel().end}`), style: 'date' },
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: this.getColumnHeaderWidth(),
                    body: this.getPrintViewContent()
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                margin: [0, 10, 0, 0]
            }
        }

        this.buttonLoader = true;

        this._pdfService
            .generatePDF(option, isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; })
            .finally(() => this.buttonLoader = false);
    }

}
