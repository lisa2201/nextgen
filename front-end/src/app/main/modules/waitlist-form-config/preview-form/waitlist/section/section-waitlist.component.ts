import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output, QueryList, ViewChildren,
} from '@angular/core';
import {ControlContainer, FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {MatExpansionPanel} from '@angular/material/expansion';
import {Country} from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import {ActivatedRoute} from '@angular/router';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
// import {SignaturePad} from 'angular2-signaturepad/signature-pad';
import {fadeMotion, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {AppConst} from 'app/shared/AppConst';
import {CommonService} from 'app/shared/service/common.service';
import {Sections} from '../../../models/sections.model';
import {SignaturePad} from 'angular2-signaturepad';

@Component({
    selector: 'waitlist-section',
    templateUrl: './section-waitlist.component.html',
    styleUrls: ['./section-waitlist.component.scss'],
    viewProviders: [MatExpansionPanel],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class SectionWaitlistComponent implements OnInit {
    panelOpenState = false;
    flip = false;

    @Output() checkBoxes: EventEmitter<any>;
    @Input() section: Sections;
    @Input() allergiesList: any;
    @Input() formGroup: FormGroup;
    @Input() signaturesList: any = []

    @ViewChildren(SignaturePad) public signature: QueryList<SignaturePad>;

    time: string[];
    emergency: string[];
    bornOrNotBorn: boolean;
    s3Bucket: string;
    s3Path: string;
    indeterminate: boolean;
    attendanceFormStatus: string;
    // checkBoxes: any = [];
    allChecked: boolean;
    countriesList: Country[] = []; // Country Select
    activatedSignatures: any = [];

    constructor(
        private controlContainer: ControlContainer,
        private _formBuilder: FormBuilder,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
    ) {
        this.checkBoxes = new EventEmitter();
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.ENROLMENT;
        this.bornOrNotBorn = false;
        this.attendanceFormStatus = '';
        this.time = [
            'AM',
            'PM',
            'All Day'
        ];

        this.emergency = [
            'Collection',
            'Emergency',
            'Medical',
            'Excursion'
        ];
    }


    ngOnInit(): void {
        this._setInitData();
    };

    /**
     * Set select data
     */
    _setInitData(): void {

        const resolveData = this._route.snapshot.data['countryList'];

        if (!_.isEmpty(resolveData)) {

            this.countriesList = resolveData[0];
        }

    }

    onSpecialized(section) {
        section.specialized = !section.specialized;
    }


    /**
     * disable future dates
     *
     */
    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    /**
     * disable past dates
     *
     */
    disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) < 0;
    }

    changeMultiChecks(input: string, event: boolean, option: string): void {
        this.checkBoxes.next({event: event, name: input, value: option});
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {

        return this.formGroup.controls;
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    get attendanceArray() {
        return this.formGroup.get('attendance') as FormArray;
    }

    onChildBornCheck(mode: boolean): void {
        setTimeout(() => {
            if (mode == true) {
                this.formGroup.get('dateOfBirth').enable()
                this.formGroup.get('childGender').enable()
            } else {
                this.formGroup.get('dateOfBirth').disable()
                this.formGroup.get('childGender').disable()
            }
        }, 200);
    }

    /**
     * update all attendance items
     */
    updateAllChecked(): void {
        // console.log('this.fc.attendance.value');
        // console.log(this.fc.attendance.value[0]);
        this.indeterminate = false;

        this.fc.attendance
            .patchValue(this.fc.attendance.value.map(() => this.allChecked), {emitEvent: false});

        this.fc.attendance.markAllAsTouched();

        this.hasAttendanceFormError();
    }

    /**
     * check if attendance has error
     */
    hasAttendanceFormError(): void {
        this.attendanceFormStatus = (this.formGroup.get('attendance').hasError('required') && this.formGroup.get('attendance').touched) ? 'error' : '';
    }


    /**
     * update single attendance item
     */
    updateSingleChecked(): void {
        if (this.fc.attendance.value.every(item => item === false)) {
            this.allChecked = false;
            this.indeterminate = false;
        } else if (this.fc.attendance.value.every(item => item === true)) {
            this.allChecked = true;
            this.indeterminate = false;
        } else {
            this.indeterminate = true;
        }

        this.hasAttendanceFormError();
    }

    gotoPage(url): void {
        window.open((url.includes('http://') || url.includes('https://')) ? url : 'http://' + url, '_blank');
    }

    clearSignature(name): void {
        this.activatedSignatures[this.section['section_code']] = _.filter(this.signaturesList, {'section': this.section['section_code']});
        const key = this.activatedSignatures[this.section['section_code']].findIndex(x => x.name === name);
        this.signature['_results'][key].clear()
    }
}
