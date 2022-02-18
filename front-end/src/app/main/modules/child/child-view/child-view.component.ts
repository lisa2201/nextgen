import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildService } from '../services/child.service';
import { CommonService } from 'app/shared/service/common.service';
import { ChildrenService } from '../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../child.model';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Room } from '../../room/models/room.model';
import { AppConst } from 'app/shared/AppConst';
import { User } from '../../user/user.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { browserRefresh } from 'app/app.component';
import { ChildCulturalDetails } from '../child-details/cultural-background-view/child-cultural-details.model';
import {FileListItem} from '../../../../shared/components/s3-upload/s3-upload.model';
import {Branch} from '../../branch/branch.model';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import { School } from '../../service-settings/bus-list/school-list.model';
import { Bus } from '../../service-settings/bus-list/bus-list.model';

@Component({
    selector: 'child-view',
    templateUrl: './child-view.component.html',
    styleUrls: ['./child-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    childForm: FormGroup;

    child: Child;
    busList: Bus[];
    schoolList: School[];
    selectedSchool: any;
    pageType: string;
    buttonLoader: boolean;
    childBusses: any;
    selectedBus: any;
    selectedRoom: any;
    confirmModal: NzModalRef;
    tableLoading: boolean;

    attendanceList: any;
    allChecked: boolean;
    indeterminate: boolean;
    attendanceFormStatus: string;
    showCCSInput: boolean;
    current: number;

    uploadTypes: string;
    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    hasWhiteSpace: boolean;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildService} _childService
     * @param {CommonService} _commonService
     * @param {ChildrenService} _childrenService
     * @param {NotificationService} _notification
     * @param _modalService
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _childService: ChildService,
        private _commonService: CommonService,
        private _childrenService: ChildrenService,
        private _notification: NotificationService,
        private _modalService: NzModalService
    )
    {
        // Set default values
        this.buttonLoader = false;
        this.attendanceList = this._commonService.getWeekDays();
        this.attendanceFormStatus = '';
        this.current = 0;
        this.selectedBus = null;
        this.selectedRoom = null;
        this.childForm = this.createChildForm();
        this.hasWhiteSpace = false;

        this.addAttendanceCheckbox();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.uploadTypes = 'image/*';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.CHILD_Profile;
        this.uploadFileMap = {};
        this.childBusses = [];

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child add/edit view !!!');

        // Subscribe to child changes
        this._childService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: Child) =>
            {
                this._logger.debug('[child]', child);

                if (child)
                {
                    this.pageType = 'edit';
                    this.child = child;
                    this.childBusses = child.bus;
                    this.childBusses = this.childBusses.sort((a, b) => {
                        if(b.bus && a.bus)
                            return a.bus.bus_name.toUpperCase() < b.bus.bus_name.toUpperCase()? -1 : 1;
                    });
                    this.indeterminate = this.child.attendance.length > 0;

                    this.setChildFormValues();

                    // ccs visibility check
                    this.showCCSInput = true;

                    // when browser refreshed set selected child manually
                    if (browserRefresh)
                    {
                        this._childrenService.setDefaultCurrentChild(this.child);
                    }
                }
                else
                {
                    this.pageType = 'new';
                }
            });

        this._childService
            .onBusListChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((busList: any) =>
            {
                this._logger.debug('[busList]', busList);
                this.busList = busList.items;
            });

        this._childService
            .onSchoolListChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((schoolList: any) =>
            {
                this._logger.debug('[schoolList]', schoolList);
                this.schoolList = schoolList.items;
                this.onSchoolSelect(this.selectedSchool);
            });


        this.onChanges();
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.uploadFileMap[inputName] = _.map(fileList, 'key');
    }

    /**
     * On change
     */
    onChanges(): void
    {
        this.childForm
            .get('attendance')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateSingleChecked());

            this.childForm
            .get('ccs_id')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                this.hasWhiteSpace =  value.indexOf(' ') >= 0 ? true : false;
                
            });
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

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /**
     * tab navigation previous
     */
    pre(): void
    {
        this.current -= 1;
    }

    /**
     * tab navigation new
     */
    next(): void
    {
        this.current += 1;
    }

    /**
     * update tab navigation position
     */
    updatePosition(index: number): void
    {
        this.current = index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.childForm.controls;
    }

    /**
     * disable future dates
     *
     * @memberof ChildAddDialogComponent
     */
    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createChildForm(): FormGroup
    {
        return new FormGroup({
            f_name: new FormControl('', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-]+$')]),
            m_name: new FormControl('', [Validators.maxLength(150),  Validators.pattern('^[a-zA-Z 0-9_)(-]+$')]),
            l_name: new FormControl('', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-]+$')]),
            // adding legal name as optional
            legal_first_name: new FormControl('', [Validators.maxLength(150)]),
            legal_last_name: new FormControl('', [Validators.maxLength(150)]),

            gender: new FormControl(null, [Validators.required]),
            desc: new FormControl('', [Validators.maxLength(500)]),

            date_of_birth: new FormControl('', [Validators.required]),
            join: new FormControl('', [Validators.required]),

            ccs_id: new FormControl('', [Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')]),

            status: new FormControl(true, [Validators.required]),
            nappy: new FormControl(false),
            bottle_feed: new FormControl(false),

            attendance: new FormArray([], minSelectedCheckboxes()),
            image: new FormControl(''),

            home_address: new FormControl(''),
            suburb: new FormControl(''),
            state: new FormControl(''),
            postalcode: new FormControl(''),
            court_orders: new FormControl(false),

            // bus: new FormControl(null),
            school: new FormControl(null)

        });
    }


    /**
     * set form values
     */
    setChildFormValues(): void
    {
        this.childForm.get('f_name').patchValue(this.child.firstName, { emitEvent: false });
        this.childForm.get('m_name').patchValue(this.child.middleName, { emitEvent: false });
        this.childForm.get('l_name').patchValue(this.child.lastName, { emitEvent: false });
        // adding legal name as optional
        this.childForm.get('legal_first_name').patchValue(this.child.legalFirstName, { emitEvent: false });
        this.childForm.get('legal_last_name').patchValue(this.child.legalLastName, { emitEvent: false });

        this.childForm.get('gender').patchValue(this.child.gender, { emitEvent: false });
        this.childForm.get('desc').patchValue(this.child.desc, { emitEvent: false });

        this.childForm.get('date_of_birth').patchValue(DateTimeHelper.parseMomentDate(this.child.dob), { emitEvent: false });
        this.childForm.get('join').patchValue(DateTimeHelper.parseMomentDate(this.child.joinDate), { emitEvent: false });

        this.childForm.get('home_address').patchValue(this.child.homeAddress, { emitEvent: false });
        this.childForm.get('suburb').patchValue(this.child.suburb, { emitEvent: false });
        this.childForm.get('state').patchValue(this.child.state, { emitEvent: false });
        this.childForm.get('postalcode').patchValue(this.child.postalCode, { emitEvent: false });
        this.childForm.get('court_orders').patchValue(this.child.courtOrders, { emitEvent: false });

        this.childForm.get('ccs_id').patchValue(this.child.CRN, { emitEvent: false });

        this.childForm.get('status').patchValue(this.child.status, { emitEvent: false });
        this.childForm.get('nappy').patchValue(this.child.nappyRequired, { emitEvent: false });
        this.childForm.get('bottle_feed').patchValue(this.child.bottleFeedRequired, { emitEvent: false });

        this.childForm.get('attendance').patchValue(this.attendanceList.map((d: any, i: number) => _.findIndex(this.child.attendance, ['index', d.index]) > -1), { emitEvent: false });
        this.childForm.get('image').patchValue(this.child.image, { emitEvent: false });

        if(this.childBusses.length)
        {
            this.childForm.get('school').patchValue(this.childBusses[0].school.index, { emitEvent: false });
            this.onSchoolSelect(this.childBusses[0].school.index);
        }

    }

    /**
     * add attendance to form array
     */
    addAttendanceCheckbox(): void
    {
        this.attendanceList.forEach((v: any, i: number) =>
        {
            const control = new FormControl(false);
            (this.fc.attendance as FormArray).push(control);
        });
    }

    /**
     * check if attendance has error
     */
    hasAttendanceFormError(): void
    {
        this.attendanceFormStatus = (this.childForm.get('attendance').hasError('required') && this.childForm.get('attendance').touched) ? 'error' : '';
    }

    /**
     * update all attendance items
     */
    updateAllChecked(): void
    {
        this.indeterminate = false;

        this.fc.attendance
            .patchValue(this.fc.attendance.value.map(() => this.allChecked), { emitEvent: false });

        this.fc.attendance.markAllAsTouched();

        this.hasAttendanceFormError();
    }

    /**
     * update single attendance item
     */
    updateSingleChecked(): void
    {
        if (this.fc.attendance.value.every(item => item === false))
        {
            this.allChecked = false;
            this.indeterminate = false;
        }
        else if (this.fc.attendance.value.every(item => item === true))
        {
            this.allChecked = true;
            this.indeterminate = false;
        }
        else
        {
            this.indeterminate = true;
        }

        this.hasAttendanceFormError();
    }

    /**
     * add/remove room
     *
     * @param {{ item: Room, action: string }} event
     */
    updateSelectedRoom(event: { item: Room, action: string }): void
    {
        if (event.action === AppConst.modalActionTypes.NEW)
        {
            this.child.rooms = this.child.rooms.concat([event.item]);
        }
        else
        {
            this.child.rooms = this.child.rooms
                .filter((i) => i.id !== event.item.id)
                .map((v, i) => {
                    v.index = i;
                    return v;
                });
        }
    }

    /**
     * add/remove user
     *
     * @param {{ item: User, action: string }} event
     */
    updateSelectedUser(event: { item: User, action: string }): void
    {
        if (event.action === AppConst.modalActionTypes.NEW)
        {
            this.child.parents = this.child.parents.concat([event.item]);
        }
        else
        {
            this.child.parents = this.child.parents
                .filter((i) => i.id !== event.item.id)
                .map((v, i) => {
                    v.index = i;
                    return v;
                });
        }
    }

    /**
     * update users
     *
     * @param {User[]} parents
     */
    updatePayer(parents: User[]): void {
        this.child.parents = parents;
    }

    /**
     * update cultural details
     *
     * @param {{ item: ChildCulturalDetails, action: string }} event
     */
    updateCulturalDetails(event: { item: ChildCulturalDetails}): void
    {
            this.child.cultural = event.item;

    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.childForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.attendanceFormStatus = '';
        this.allChecked = false;
        this.indeterminate = false;
    }


    onSchoolSelect(e: string) : void
    {
        this.selectedBus = null;
        this.selectedSchool= e;
        this._childService
            .getSchoolBusList(e)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(null)
            )
            .subscribe(
                res =>
                {
                    this._logger.debug('[filtered buslist]', res);
                    this.busList = res.data;
                    // if the selected school has the bus the child is assigned to, select it.
                    if(this.busList.find(x => x.id === this.child.bus.index))
                        this.selectedBus = this.child.bus.index;
                },
                error =>
                {
                    throw error;
                }
            );

    }

    onSelectedBus(e: string): void
    {
        this.selectedBus = e;
    }

    onSelectedRoom(e: string): void
    {
        this.selectedRoom = e;
    }
    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.childForm.invalid)
        {
            return;
        }

        const selectedAttendance = this.childForm.value.attendance
            .map((v: any, i: string | number) => v ? this.attendanceList[i] : null)
            .filter((v: any) => v !== null)
            .map((v: { index: any; }) => v.index);

        const sendObj = {
            id: this.child.id,
            f_name: this.fc.f_name.value,
            m_name: this.fc.m_name.value,
            l_name: this.fc.l_name.value,
            legal_first_name: this.fc.legal_first_name.value,
            legal_last_name: this.fc.legal_last_name.value,
            gender: this.fc.gender.value,
            desc: this.fc.desc.value,
            attendance: selectedAttendance,
            dob: DateTimeHelper.getUtcDate(this.fc.date_of_birth.value),
            join: DateTimeHelper.getUtcDate(this.fc.join.value),
            status: this.fc.status.value,
            nappy: this.fc.nappy.value,
            bottle_feed: this.fc.bottle_feed.value,
            rooms: this.child.rooms.map(c => c.id),
            users: this.child.parents.map(c => c.id),
            cultural: this.child.cultural,
            crn: this.fc.ccs_id.value,
            home_address: this.fc.home_address.value,
            suburb: this.fc.suburb.value,
            state: this.fc.state.value,
            postalcode: this.fc.postalcode.value,
            court_orders: this.fc.court_orders.value,
            upload_file: this.uploadFileMap,
            // bus: this.fc.bus.value,
            // school: this.fc.school.value
        };

        this._logger.debug('[child object]', sendObj);

        this.buttonLoader = true;

        this._childrenService
            .updateChild(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {
                    this.child = res.item;

                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    /*add bus
    * */
    addBus(): void
    {
        console.log(this.fc.school.value);
        console.log(this.selectedBus);
        console.log(this.selectedRoom);
        if(this.fc.school.value === null || this.selectedBus === null || this.selectedRoom === null)
        {
            setTimeout(() => {
                this._notification.displaySnackBar('Please fill All values!', NotifyType.WARNING);
            }, 200);
            return;
        }

        const sendObj = {
            'child' : this.child.id,
            'room': this.selectedRoom,
            'bus': this.selectedBus,
            'school': this.selectedSchool
        };
        if(this.childBusses.length)
        {
            if(this.selectedSchool !== this.childBusses[0].school.index)
            {
                sendObj['school_changed'] = true;
                this.confirmModal = this._modalService
                    .confirm(
                        {
                            nzTitle: 'You have changed the child\'s school.',
                            nzContent: 'Please be aware that changing the school will cause to remove all of the assigned buses from the child.',
                            nzWrapClassName: 'vertical-center-modal',
                            nzOkText: 'Yes',
                            nzOkType: 'danger',
                            nzOnOk: () => {
                                this._childrenService
                                    .addChildBus(sendObj)
                                    .pipe(
                                        takeUntil(this._unsubscribeAll),
                                        finalize(() => this.buttonLoader = false)
                                    )
                                    .subscribe(
                                        res =>
                                        {
                                            this.child = res.item;
                                            this.childBusses = this.child.bus;
                                            this._notification.clearSnackBar();

                                            if(res.message === 'This record already exists!')
                                                setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.WARNING), 200);
                                            else
                                                setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                                        },
                                        error =>
                                        {
                                            throw error;
                                        },
                                        () =>
                                        {
                                            this._logger.debug('😀 all good. 🍺');
                                        }
                                    );
                            }
                        }
                    );
            }
            else
            {
                sendObj['school_changed'] = false;
                this._childrenService
                    .addChildBus(sendObj)
                    .pipe(
                        takeUntil(this._unsubscribeAll),
                        finalize(() => this.buttonLoader = false)
                    )
                    .subscribe(
                        res =>
                        {
                            this.child = res.item;
                            this.childBusses = this.child.bus;
                            this._notification.clearSnackBar();

                            if(res.message === 'This record already exists!')
                                setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.WARNING), 200);
                            else
                                setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                        },
                        error =>
                        {
                            throw error;
                        },
                        () =>
                        {
                            this._logger.debug('😀 all good. 🍺');
                        }
                    );
            }
        }
        else
        {
            sendObj['school_changed'] = false;
            this._childrenService
                .addChildBus(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => this.buttonLoader = false)
                )
                .subscribe(
                    res =>
                    {
                        this.child = res.item;
                        this.childBusses = this.child.bus;
                        this._notification.clearSnackBar();

                        if(res.message === 'This record already exists!')
                            setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.WARNING), 200);
                        else
                            setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                    },
                    error =>
                    {
                        throw error;
                    },
                    () =>
                    {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }
    }
    deleteBus(e: MouseEvent, item): void  {
        e.preventDefault();
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete this bus?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            const sendObj = {
                                'child' : this.child.id,
                                'id': item.id,
                            };
                            this._childrenService
                                .deleteChildBus(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    res => {

                                        this.child = res.item;
                                        this.childBusses = this.child.bus;
                                        this._notification.clearSnackBar();

                                        if(res.message === 'Record Cannot be found!')
                                        {
                                            setTimeout(() => {
                                                this._notification.displaySnackBar(res.message, NotifyType.WARNING);
                                            }, 200);
                                        }
                                        else
                                        {
                                            setTimeout(() => {
                                                this._notification.displaySnackBar(res.message, NotifyType.SUCCESS);
                                            }, 200);
                                        }
                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    getChildProfileImage(item: any) : string
    {
        if(item.image)
        {
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        }
        else
        {
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
        }
    }
}
