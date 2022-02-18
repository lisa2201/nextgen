import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService, helpMotion } from 'ng-zorro-antd';
import { AuthService } from 'app/shared/service/auth.service';
import { takeUntil } from 'rxjs/operators';
import { ProfileSettingService } from '../../services/profile-setting.service';
import { Subject } from 'rxjs';
import { User } from 'app/main/modules/user/user.model';
import { Child } from 'app/main/modules/child/child.model';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { valueExists } from 'app/shared/validators/asynValidator';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { CustomValidators } from 'app/shared/validators/custom-validators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Country } from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CountryResolverService } from 'app/main/modules/waitlist-form-config/services/country-resolver.service';
import { confirmPasswordValidator } from 'app/shared/validators/confirm-password';

@Component({
    selector: 'user-personal-Info',
    templateUrl: './personal-Info.component.html',
    styleUrls: ['./personal-Info.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
      ]
   
})
export class PersonalInfoComponent implements OnInit, OnDestroy {
    isEditBasic: boolean;
    isEditContact: boolean;
    isEditPassword:boolean;

    isLoadingBasicData: boolean;

    isLoadingBasicTpl:boolean;
    isLoadingContactTpl:boolean;
    isLoadingPasswordTpl:boolean;
    countriesList: Country[] = []; // Country Select

    userData: User;
    child: any[];
    profileForm: FormGroup;
    passwordForm: FormGroup;
    
    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    _roomService: any;
    editMode: any;
    matDialogRef: any;
    private _route: any;
    countryName: any;

    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _profileSettingService: ProfileSettingService,
        private _modalService: NzModalService,
        private _authService: AuthService,
        public _countryResolverService: CountryResolverService,

    ) {
        this.buttonLoader = false;

        this.isLoadingBasicTpl = false;
        this.isLoadingContactTpl = false;
        this.isLoadingPasswordTpl = false;

        this.isLoadingBasicData = false;

        this.isEditBasic = false;
        this.isEditContact = false;
        this.isEditPassword = false;

        this.countryName = null;
        
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        this._countryResolverService
        .resolve()
        .pipe()
        .subscribe((value: any) => {
            this.countriesList = value[0];
            this.getCountryName();
        })

        this._profileSettingService.onDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((userData: any) => {
                this._logger.debug('[user-data]', userData);
                this.userData = userData.user;
                this.child = userData.child;
                this.getCountryName();

            });
            this.createProfileForm();
            this.createPasswordForm();
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    getCountryName():void{
        this.countryName = this.countriesList.find(e => e.code === this.userData.country);
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    get fc(): any {
        return this.profileForm.controls;
    }

    get formVal(): any {
        return this.passwordForm.controls;
    }

        disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    createProfileForm(): void {
        this.profileForm = new FormGroup({
            first_name: new FormControl(this.editBasic ? this.userData.firstName :'', this.isEditBasic? [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z \-\']+')] : null),
            last_name: new FormControl(this.editBasic ? this.userData.lastName :'', this.isEditBasic? [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z \-\']+')] : null),
            date_of_birth: new FormControl(this.editBasic ? this.userData.dob :'', this.isEditBasic? [Validators.required] : null),
            email: new FormControl(this.editBasic ? this.userData.email :'', this.isEditBasic? [Validators.required, Validators.email, Validators.maxLength(150)]: null),
            secondary_email: new FormControl(this.editBasic ? this.userData.secondaryEmail :'', this.isEditBasic? [Validators.email, Validators.maxLength(150)] : null),
            phone: new FormControl(this.editContact ? this.userData.mobileNumber :'', this.isEditContact? [Validators.maxLength(15), Validators.pattern('^[0-9]*$')] : null),
            address_line_1: new FormControl(this.editContact ? this.userData.address1 :'', this.isEditContact? [Validators.maxLength(320)]: null),
            address_line_2: new FormControl(this.editContact ? this.userData.address2 :'', this.isEditContact? [Validators.maxLength(320)]: null),
            city: new FormControl(this.editContact ? this.userData.city :'', this.isEditContact? [Validators.maxLength(120)]: null),
            zip_code: new FormControl(this.editContact ? this.userData.zipCode :'', this.isEditContact? [Validators.pattern('^[0-9]*$')]: null),
            country: new FormControl(this.editContact ? this.userData.country : null,  this.isEditContact? [Validators.required]: null),
            state: new FormControl(this.editContact ? this.userData.state :''),
            mobile: new FormControl(this.editContact ? this.userData.phoneNumber :'', [Validators.maxLength(15)]),
            ccs_id: new FormControl(this.editContact ? this.userData.ccsId :''),
            work_phone: new FormControl(this.editContact ? this.userData.workPhoneNumber :'', [Validators.maxLength(50)]),
            work_mobile: new FormControl(this.editContact ? this.userData.workMobileNumber :'', [Validators.maxLength(50)]),

        });
    }

        createPasswordForm(): void {
        this.passwordForm = new FormGroup({
            password: new FormControl('', [
                Validators.required,
                CustomValidators.patternValidator(/\d/, { hasNumber: true }),
                CustomValidators.patternValidator(/[A-Z]/, { hasCapitalCase: true }),
                CustomValidators.patternValidator(/[a-z]/, { hasSmallCase: true }),
                CustomValidators.patternValidator(/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { hasSpecialCharacters: true }),
                Validators.minLength(6)
            ]),
            current_password: new FormControl('', [Validators.required]),
            passwordConfirm: new FormControl('', [Validators.required, confirmPasswordValidator]),

        });
    }

    editBasic(e: MouseEvent): void {
            this.createProfileForm();
        
        setTimeout(() => {
            
            this.isLoadingBasicData = true;
        }, 1000);
        this.isEditContact = false;
        this.isEditPassword= false;
        this.isEditBasic = true;
        console.log(this.isEditBasic);
        console.log(this.isEditContact);
        console.log(this.isEditPassword);
    //    basic form validations
        this.profileForm.controls['first_name'].setValidators([Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z \-\']+')]);
        this.profileForm.controls['last_name'].setValidators([Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z \-\']+')]);
        this.profileForm.controls['date_of_birth'].setValidators([Validators.required]);
        this.profileForm.controls['email'].setValidators([Validators.required, Validators.email, Validators.maxLength(150)]);
        this.profileForm.controls['secondary_email'].setValidators([Validators.email, Validators.maxLength(150)]);

        this.profileForm.controls['first_name'].updateValueAndValidity();
        this.profileForm.controls['last_name'].updateValueAndValidity();
        this.profileForm.controls['date_of_birth'].updateValueAndValidity();
        this.profileForm.controls['email'].updateValueAndValidity();
        this.profileForm.controls['secondary_email'].updateValueAndValidity();


    }

    cancelBasic(e: MouseEvent): void {
        setTimeout(() => {

            this.isLoadingBasicData = false;
        }, 500);
        this.isEditBasic = false;
        console.log(this.isEditBasic);
        console.log(this.isEditContact);
        console.log(this.isEditPassword);

        this.profileForm.controls['first_name'].clearValidators();
        this.profileForm.controls['last_name'].clearValidators();
        this.profileForm.controls['date_of_birth'].clearValidators();
        this.profileForm.controls['email'].clearValidators();
        this.profileForm.controls['secondary_email'].clearValidators();

        this.profileForm.controls['first_name'].updateValueAndValidity();
        this.profileForm.controls['last_name'].updateValueAndValidity();
        this.profileForm.controls['date_of_birth'].updateValueAndValidity();
        this.profileForm.controls['email'].updateValueAndValidity();
        this.profileForm.controls['secondary_email'].updateValueAndValidity();
    }

    editContact(e: MouseEvent): void {
        this.createProfileForm();
        setTimeout(() => {
            this.isLoadingBasicData = true;
        }, 500);
        this.isEditBasic = false;
        this.isEditPassword = false;
        this.isEditContact = true;
        console.log(this.isEditBasic);
        console.log(this.isEditContact);
        console.log(this.isEditPassword);

        this.profileForm.controls['phone'].setValidators([ Validators.maxLength(50), Validators.pattern('^[0-9]*$')]);
        this.profileForm.controls['zip_code'].setValidators([Validators.pattern('^[0-9]*$')]);

        this.profileForm.controls['phone'].updateValueAndValidity();
        this.profileForm.controls['zip_code'].updateValueAndValidity();
    }

    cancelContact(e: MouseEvent): void {
        setTimeout(() => {
            this.isLoadingBasicData = false;
        }, 500);
        this.isEditContact = false;
        console.log(this.isEditBasic);
        console.log(this.isEditContact);
        console.log(this.isEditPassword);

        this.profileForm.controls['phone'].clearValidators();
        this.profileForm.controls['zip_code'].clearValidators();

        this.profileForm.controls['phone'].updateValueAndValidity();
        this.profileForm.controls['zip_code'].updateValueAndValidity();
    }

    editPassword(e: MouseEvent): void {
            this.createPasswordForm();
        
        // setTimeout(() => {
            
        //     this.isLoadingBasicData = true;
        // }, 1000);
        this.isEditContact = false;
        this.isEditBasic = false;
        this.isEditPassword = true;
        console.log(this.isEditBasic);
        console.log(this.isEditContact);
        console.log(this.isEditPassword);
    }

    cancelPassword(e: MouseEvent): void {
        // setTimeout(() => {

        //     this.isLoadingBasicData = false;
        // }, 500);
        this.isEditPassword = false;
        console.log(this.isEditBasic);
        console.log(this.isEditContact);
        console.log(this.isEditPassword);
    }

    onBasicFormSubmit(e: MouseEvent): void
    {
        this.isLoadingBasicTpl = true;
        e.preventDefault();

        if (this.profileForm.invalid) {
            return;
        }

        const data = {
            reference: this.userData.id,
            type: 1,
            first: this.fc.first_name.value,
            last: this.fc.last_name.value,
            dob: DateTimeHelper.getUtcDate(this.fc.date_of_birth.value),
            email: this.fc.email.value,
            secondary_email: this.fc.secondary_email.value
            // sEmail:this.fc.secondary_email.value,
        };
            

        this._logger.debug('[profile object]',data);

        this.buttonLoader = true;

        this._profileSettingService.updateUserDate(data)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;
                    this.isLoadingBasicTpl = false;
                    this.userData = res.userData;
                    this.isEditBasic = false;
                    // this.resetForm(null);
                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                    // setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;
                    this.isLoadingBasicTpl = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    onContactFormSubmit(e: MouseEvent): void
    {
        this.isLoadingContactTpl = true;
        e.preventDefault();

        if (this.profileForm.invalid) {
            return;
        }

        const data = {
            reference: this.userData.id,
            type: 2,
            address1: this.fc.address_line_1.value,
            address2: this.fc.address_line_2.value,
            phone: this.fc.phone.value,
            zip: this.fc.zip_code.value,
            city: this.fc.city.value,
            country: this.fc.country.value,
            state: this.fc.state.value,

            mobile: this.fc.mobile.value,
            ccs_id: this.fc.ccs_id.value,
            work_phone: this.fc.work_phone.value,
            work_mobile: this.fc.work_mobile.value,

        };

        this._logger.debug('[profile object]',data);

        this.buttonLoader = true;

        this._profileSettingService.updateUserDate(data)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this._logger.debug('[user data ]',res);
                    this.buttonLoader = false;
                    this.isLoadingContactTpl = false;
                    this.userData = res.userData,
                    this.isEditContact = false;
                    // this.resetForm(null);
                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                    // setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;
                    this.isLoadingContactTpl = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

        onPasswordFormSubmit(e: MouseEvent): void
    {
        this.isLoadingPasswordTpl = true;
        e.preventDefault();

        if (this.passwordForm.invalid) {
            return;
        }

        const data = {
            type:3,
            password: this.formVal.password.value,
            current_password : this.formVal.current_password.value
        };

        this._logger.debug('[password object]',data);

        this.buttonLoader = true;

        this._profileSettingService.updateUserDate(data)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;
                    this.isLoadingPasswordTpl = false;
                    this.isEditPassword = false;
                    // this.resetForm(null);
                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                    // setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;
                    this.isLoadingPasswordTpl = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

}
