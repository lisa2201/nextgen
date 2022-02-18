import { Component, OnInit, ViewEncapsulation, OnDestroy, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotificationService } from 'app/shared/service/notification.service';
import { UserService } from '../services/user.service';

import { User } from '../user.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';
import { AuthService } from 'app/shared/service/auth.service';
import { AuthUser } from 'app/shared/model/authUser';
import { UsersService } from '../services/users.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { valueExists } from 'app/shared/validators/asynValidator';
import { CommonService } from 'app/shared/service/common.service';
import { Room } from '../../room/models/room.model';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { UserSetRoomComponent } from './user-set-room/user-set-room.component';
import {FileListItem} from '../../../../shared/components/s3-upload/s3-upload.model';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import * as ct from 'countries-and-timezones';
import { AnyARecord } from 'dns';

@Component({
    selector: 'user-view',
    templateUrl: './user-view.component.html',
    styleUrls: ['./user-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class UserViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    @Output()
    updateScroll: EventEmitter<any>;

    setRoomModal: NzModalRef;
    confirmModal: NzModalRef;
    user: User;
    rooms: Room[];

    userForm: FormGroup;
    showCCSInput: boolean;
    pageType: string;
    buttonLoader: boolean;
    addbuttonLoader: boolean;
    current: number;
    pincodenull: boolean;
    hasWhiteSpace: boolean;
    buttonLoaderGen: boolean;
    indeterminate: boolean;
    allChecked: boolean;

    authUser: AuthUser;
    canViewRolePermsSection: boolean;
    roleLevels: typeof AppConst.roleLevel;
    qualificationLevel: string[];
    medicalQualification: string[];
    registeredPosition: string[];
    responsiblePersonOrder: string[];
    role: string;

    countries: any;
    selectedState: any;

    uploadTypes: string;
    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    attendanceList: any;
    attendanceFormStatus: string;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {Router} _router
     * @param {UserService} _userService
     * @param _authService
     * @param _usersService
     * @param _commonService
     * @param _modalService
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _router: Router,
        private _userService: UserService,
        private _authService: AuthService,
        private _usersService: UsersService,
        private _commonService: CommonService,
        private _modalService: NzModalService,
    )
    {
        // Set defaults
        this.authUser = this._authService.currentUserValue;
        this.canViewRolePermsSection = (this._authService.isAdmin() || this._authService.isOwner() || this.authUser.isAdministrator);
        this.roleLevels = AppConst.roleLevel;
        this.showCCSInput = false;
        this.buttonLoader = false;
        this.addbuttonLoader = false;
        this.pincodenull = true;
        this.current = 0;
        this.userForm = this.createUserForm();
        this.selectedState = [];
        this.countries = [];
        this.hasWhiteSpace = false;

        this.uploadTypes = 'image/*';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.STAFF;
        this.uploadFileMap = {};
        this.buttonLoaderGen = false;
        this.attendanceFormStatus = '';

        // Set the private defaults
        this.updateScroll = new EventEmitter();
        this._unsubscribeAll = new Subject();
        this.attendanceList = this._commonService.getWeekDays();
        this.addAttendanceCheckbox();

        this.qualificationLevel = [
            'Certificate III Level',
            'Diploma Level',
            'Early Childhood Teacher',
            'FDC coordinator',
            'Suitably qualified person'
        ]

        this.medicalQualification = [
            'Anaphulaxis Management',
            'Emergency Asthma Management',
            'First Aid Qualification'
        ]

        this.registeredPosition = [
            'Educational Leader',
            'Educator',
            'Nominated Supervisor',
            'Responsible Person',
            'Room Leader'
        ]

        this.responsiblePersonOrder = [
            'P1',
            'P2',
            'P3',
            'P4',
            'P5'
        ]

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('branch edit');
        this._userService
            .onStateChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((state: any) =>
            {
                this._logger.debug('[state]', state);
                this.countries = state.countries;
            });
        /*this._router
            .events
            .pipe(
                filter(e => e instanceof NavigationStart),
                map(() => this._router.getCurrentNavigation().extras.state)
            )
            .subscribe(data =>
            {
                console.log(data);
            });*/

        // Subscribe to user changes
        this._userService
            .onUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) =>
            {
                this._logger.debug('[user]', user);

                if (user)
                {
                    this.pageType = 'edit';
                    this.user = user;
                    this.rooms =  this.user.rooms? this.user.rooms.map((i: any, idx: number) => new Room(i, idx)) : [];
                    this.setUserFormValues();
                    this.selectedState = this.getState(this.user.country)
                    // ccs visibility check
                    // this.showCCSInput = this.user.hasPermission('N23', ['AC0']);
                    this.showCCSInput = true;
                    this.role = (this.user.roleLevel === this.roleLevels.ADMINISTRATION) ? this.roleLevels.ADMINISTRATION : '';
                    this.indeterminate = this.user.attendance.length > 0;
                    
                    if(this.user.isParentType()){
                        this.fc.attendance.clearValidators();
                    }
                }
                else
                {
                    this.pageType = 'new';
                }
            });

        // Subscribe to secondary email changes
        this.fc['secondary_email']
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(500),
                distinctUntilChanged()
            )
            .subscribe((email: string) =>
            {
                this.fc['copy_to_sub_mail'][(email === '' || this.fc['secondary_email'].invalid) ? 'disable' : 'enable']({ emitEvent: false });

                // reset
                if (email === '' || this.fc['secondary_email'].invalid)
                {
                    this.fc['copy_to_sub_mail'].patchValue(false, { emitEvent: false });
                }
            });

        this.userForm
            .get('country')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[country value change]', value);

                if (!_.isNull(value))
                {
                    this.userForm.get('state').patchValue(null);

                    this.selectedState = this.getState(value);
                }
            });

        this.userForm
            .get('ccs_id')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                this.hasWhiteSpace =  value.indexOf(' ') >= 0 ? true : false;

            });

        this.userForm
            .get('attendance')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateSingleChecked());

    }

    getState(value): any {
        return (!_.isNull(value)) ? _.filter(this.countries,(country)=> country.code2 === value)[0].states : [];
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
        return this.userForm.controls;
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
    createUserForm(): FormGroup
    {
        return new FormGroup({
            first_name: new FormControl('', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-\-\']+')]),
            last_name: new FormControl('', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z  0-9_)(-\-\']+')]),
            date_of_birth: new FormControl('', [Validators.required]),
            email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(150)]),
            secondary_email: new FormControl('', [Validators.email, Validators.maxLength(150), this.SecEmailValidator]),
            phone: new FormControl('', [Validators.maxLength(15)]),
            mobile: new FormControl('', [Validators.maxLength(15)]),
            address_line_1: new FormControl('', [Validators.maxLength(320)]),
            address_line_2: new FormControl('', [Validators.maxLength(320)]),
            city: new FormControl('', [Validators.maxLength(120)]),
            zip_code: new FormControl('', [Validators.pattern('^[0-9]*$')]),
            attendance: new FormArray([], minSelectedCheckboxes()),
            pincode: new FormControl('', [Validators.maxLength(4), Validators.pattern('^[0-9]*$')]),
            login_access: new FormControl(null, [Validators.required]),
            status: new FormControl(null, [Validators.required]),
            copy_to_sub_mail: new FormControl(null, [Validators.required]),
            ccs_id: new FormControl('', [Validators.pattern('^[a-zA-Z0-9]+$')]),
            qualification_level: new FormControl(null),
            qualification: new FormControl(null),
            medical_qualification: new FormControl(null),
            registered_position: new FormControl(null),
            resposible_person_order: new FormControl(null),
            working_hours: new FormControl(''),
            paid_lunch: new FormControl(false),
            country: new FormControl(null, []),
            state: new FormControl(null, []),
            work_phone: new FormControl('', [Validators.maxLength(50)]),
            work_mobile: new FormControl('', [Validators.maxLength(50)]),
        });
    }

    setUserFormValues(): void
    {
        this.userForm.get('first_name').patchValue(this.user.firstName, { emitEvent: false });
        this.userForm.get('last_name').patchValue(this.user.lastName, { emitEvent: false });
        this.userForm.get('date_of_birth').patchValue(DateTimeHelper.parseMomentDate(this.user.dob), { emitEvent: false });
        this.userForm.get('email').patchValue(this.user.email, { emitEvent: false });
        this.userForm.get('secondary_email').patchValue(this.user.secondaryEmail, { emitEvent: false });
        this.userForm.get('mobile').patchValue(this.user.phoneNumber, { emitEvent: false });
        this.userForm.get('phone').patchValue(this.user.mobileNumber, { emitEvent: false });
        this.userForm.get('address_line_1').patchValue(this.user.address1, { emitEvent: false });
        this.userForm.get('address_line_2').patchValue(this.user.address2, { emitEvent: false });
        this.userForm.get('city').patchValue(this.user.city, { emitEvent: false });
        this.userForm.get('zip_code').patchValue(this.user.zipCode, { emitEvent: false });
        this.userForm.get('login_access').patchValue(this.user.loginAccess, { emitEvent: false });
        this.userForm.get('pincode').patchValue(this.user.pincode);
        this.userForm.get('status').patchValue(this.user.status, { emitEvent: false });
        this.userForm.get('ccs_id').patchValue(this.user.ccsId, { emitEvent: false });
        this.userForm.get('attendance').patchValue(this.attendanceList.map((d: any, i: number) => _.findIndex(this.user.attendance, ['index', d.index]) > -1), { emitEvent: false });
        this.userForm.get('qualification_level').patchValue(this.user.kioskSetup.qualification_level, { emitEvent: false });
        this.userForm.get('qualification').patchValue(this.user.kioskSetup.qualification, { emitEvent: false });
        this.userForm.get('medical_qualification').patchValue(this.user.kioskSetup.medical_qualification, { emitEvent: false });
        this.userForm.get('registered_position').patchValue(this.user.kioskSetup.registered_position, { emitEvent: false });
        this.userForm.get('resposible_person_order').patchValue(this.user.kioskSetup.resposible_person_order, { emitEvent: false });
        this.userForm.get('working_hours').patchValue(this.user.kioskSetup.working_hours, { emitEvent: false });
        this.userForm.get('paid_lunch').patchValue(this.user.kioskSetup.paid_lunch, { emitEvent: false });

        this.userForm.get('country').setValue(this.user.country);
        this.userForm.get('state').setValue(this.user.state);

        this.userForm.get('work_phone').setValue(this.user.workPhoneNumber);
        this.userForm.get('work_mobile').setValue(this.user.workMobileNumber);

        this.userForm.get('copy_to_sub_mail').patchValue(this.user.hasSecondaryEmail, { emitEvent: false });

        if (this.user.secondaryEmail === '')
        {
            this.userForm.get('copy_to_sub_mail').disable({ emitEvent: false });
        }
        this.userForm.get('pincode').disable({ emitEvent: false });

        // add validator
        this.userForm.get('ccs_id').setValidators([
            Validators.maxLength(this.user.isAdministrativeType() ? 20 : 10),
            Validators.pattern('^[a-zA-Z0-9]+$')
        ]);

        // AsyncValidators fix
        setTimeout(() =>
        {
            this.userForm.get('pincode').setAsyncValidators([valueExists(this._commonService, 'user.pincode', this.user.id)]);
            this.userForm.get('phone').setAsyncValidators([valueExists(this._commonService, 'user.phone', this.user.id)]);
            this.userForm.get('email').setAsyncValidators([valueExists(this._commonService, 'user.email', this.user.id)]);
            this.userForm.get('secondary_email').setAsyncValidators([valueExists(this._commonService, 'user.email', this.user.id)]);

        }, 500);

        if(this.user.pincode !== ''){
            this.pincodenull = false;
        }
    }

    /**
     * update from
     */
    onSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        const selectedAttendance = this.userForm.value.attendance
            .map((v: any, i: string | number) => v ? this.attendanceList[i] : null)
            .filter((v: any) => v !== null)
            .map((v: { index: any; }) => v.index);

        const sendObj = {
            id: this.user.id,
            firstname: this.fc.first_name.value,
            lastname: this.fc.last_name.value,
            dob: DateTimeHelper.getUtcDate(this.fc.date_of_birth.value),
            email: this.fc.email.value,
            second_email: this.fc.secondary_email.value,
            phone: this.fc.phone.value,
            mobile: this.fc.mobile.value,
            address1: this.fc.address_line_1.value,
            address2: this.fc.address_line_2.value,
            city: this.fc.city.value,
            zipcode: this.fc.zip_code.value,
            attendance: selectedAttendance,
            login_access: this.fc.login_access.value,
            status: this.fc.status.value,
            pincode: this.fc.pincode.value,
            copy_to_sub_mail: this.fc.copy_to_sub_mail.value,
            ccs_id: this.fc.ccs_id.value,
            qualification_level: this.fc.qualification_level.value,
            qualification: this.fc.qualification.value,
            medical_qualification: this.fc.medical_qualification.value,
            registered_position: this.fc.registered_position.value,
            resposible_person_order: this.fc.resposible_person_order.value,
            working_hours: this.fc.working_hours.value,
            paid_lunch: this.fc.paid_lunch.value,
            country: this.fc.country.value,
            state: this.fc.state.value,
            work_phone: this.fc.work_phone.value,
            work_mobile: this.fc.work_mobile.value,
            upload_file: this.uploadFileMap,
        }

        this._logger.debug('[user object]', sendObj);

        this.buttonLoader = true;

        this._usersService
            .updateSingleUser(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {
                    this.user = res.item;

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


    generatePin(e: MouseEvent): void
    {
        e.preventDefault();

        const sendObj = {
            id: this.user.id,
        }

        this._logger.debug('[user object]', sendObj);

        this.buttonLoaderGen = true;

        this._usersService
            .generatePin(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoaderGen = false)
            )
            .subscribe(
                res =>
                {
                    this.user = res.item;
                    this.userForm.get('pincode').patchValue(this.user.pincode,{ emitEvent: false });
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


    deleteImage(e: MouseEvent): void{
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete the image?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                reference: this.user.id,
                            }
                            this._usersService
                                .deleteUserImageOnly(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        this.buttonLoader = false;
                                        resolve();
                                    }),
                                )
                                .subscribe(
                                    res =>
                                    {
                                        this.user = res.item;

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
                        });
                    }
                }
            );

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

    resetPincode(e: any): void
    {
        e.preventDefault();
        this.userForm.get('pincode').patchValue(null);
    }

    updateSecEmailValidator(): void {
        /** wait for refresh value */
        Promise.resolve().then(() => this.fc.secondary_email.updateValueAndValidity());
    }

    SecEmailValidator = (control: FormControl): { [s: string]: boolean } => {

        if (!control.parent || !control) {
            return {};
        }

        if (control.value === '') {
            return {};
        }

        if (control.value ===  control.parent.get('email').value) {
            return { duplicate: true, error: true };
        }
        return {};
    };

    addRoom(e: MouseEvent): void
    {
        e.preventDefault();

        this.addbuttonLoader = true;

        this.user.rooms.map(i => i.isLoading = true);

        this._userService
            .getRooms(this.user.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    this.user.rooms.map(i => i.isLoading = false);

                    setTimeout(() => this.addbuttonLoader = false, 100);
                })
            )
            .subscribe(response =>
            {
                this._logger.debug('[get rooms]', response);

                this.setRoomModal = this._modalService
                    .create({
                        nzTitle: 'Select Room',
                        nzContent: UserSetRoomComponent,
                        nzMaskClosable: false,
                        nzComponentParams: {
                            rooms: response
                        },
                        nzWrapClassName: 'custom-search-list',
                        nzFooter: [
                            {
                                label: 'SAVE',
                                type: 'primary',
                                disabled: componentInstance => !(componentInstance!.UserSetRoomForm.valid),
                                onClick: componentInstance =>
                                {
                                    const selectedRoom = componentInstance.getSelectedRoom();

                                    if (!_.isNull(selectedRoom))
                                    {
                                        this.user.rooms.map(i => i.isLoading = true);

                                        this.buttonLoader = true;

                                        this._userService
                                            .updateRoom({
                                                user: this.user.id,
                                                room: selectedRoom.id,
                                                type: AppConst.modalActionTypes.NEW
                                            })
                                            .pipe(
                                                takeUntil(this._unsubscribeAll),
                                                finalize(() =>
                                                {
                                                    setTimeout(() => this.user.rooms.map(i => i.isLoading = false), 50);

                                                    this.buttonLoader = false;
                                                })
                                            )
                                            .subscribe(
                                                message =>
                                                {
                                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                                    this.updateScroll.next();
                                                },
                                                error =>
                                                {
                                                    throw error;
                                                }
                                            );
                                    }

                                    this.setRoomModal.destroy();
                                }
                            },
                            {
                                label: 'CLOSE',
                                type: 'danger',
                                onClick: () => this.setRoomModal.destroy()
                            }
                        ]
                    });

                this.setRoomModal
                    .afterOpen
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(() => setTimeout(() => this.setRoomModal.getContentComponent().updateListScroll(), 250));
            });
    }

    removeRoom(item: Room, e: MouseEvent): void
    {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) =>
                        {
                            item.isLoading = true;

                            // this.buttonLoader = true;

                            this._userService
                                .updateRoom({
                                    user: this.user.id,
                                    room: item.id,
                                    type: AppConst.modalActionTypes.DELETE
                                })
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() =>
                                    {
                                        // this.buttonLoader = false;

                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.updateScroll.next();
                                    },
                                    error =>
                                    {
                                        item.isLoading = false;

                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.uploadFileMap[inputName] = _.map(fileList, 'key');
        console.log(this.uploadFileMap);
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    getStaffProfileImage(item) : string{
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return AppConst.image.PROFILE_CALLBACK;;
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
        this.attendanceFormStatus = (this.userForm.get('attendance').hasError('required') && this.userForm.get('attendance').touched) ? 'error' : '';
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

}
