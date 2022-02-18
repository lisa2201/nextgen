import { Component, OnDestroy, OnInit, Pipe, PipeTransform, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Branch } from 'app/main/modules/branch/branch.model';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { now } from 'lodash';
import * as moment from 'moment';
import { fadeMotion, NzModalRef, NzModalService, slideMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject, Subscription, timer } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CreateAttendenceComponent } from './dialog/create-attendence/create-attendence.component';
import { GetMissedAttendanceComponent } from './dialog/get-missed-attendance/get-missed-attendance.component';
import { SetBookingComponent } from './dialog/set-booking/set-booking.component';
import { KisokService } from './service/kisok.service';

@Component({
    selector: 'kisok-setup',
    templateUrl: './kisok-setup.component.html',
    styleUrls: ['./kisok-setup.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class KisokSetupComponent implements OnInit, OnDestroy {

    countDown: Subscription;
    counter: number;
    tick = 1000;

    // Private
    private _unsubscribeAll: Subject<any>;
    branch: any;
    children: any;
    phone: string;
    user: User;
    kioskForm: FormGroup;
    mobile: FormControl;
    // tslint:disable-next-line:variable-name
    pin_code: FormControl;
    buttonLoader: boolean;
    token: string;
    isLoged: boolean;
    hasUserData: boolean;
    viewLoading: boolean;
    isShowMissed: boolean;
    allChildren: any;
    missed: any;
    today: string;
    dialogRef: any;
    pinCodeCheck: any;
    phoneCheck: any;
    pinCodeChangePermission: boolean;
    mobileNumber: string;
    pinCode: string;


    date: any;
    day: any;
    month: any;
    year: any;


    setRoomModal: NzModalRef;
    confirmModal: NzModalRef;

    monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    public amount: number | string = '0777758198';

    constructor(
        private _authService: AuthService,
        private _kisokService: KisokService,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _commonService: CommonService,
        private _router: Router,
    ) {

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.kioskForm = this.createkioskForm();
        this.buttonLoader = false;
        this.token = null;
        this.isLoged = false;
        this.mobile = new FormControl({ value: null, disabled: false });
        this.pin_code = new FormControl({ value: null, disabled: false });
        this.user = null;
        this.hasUserData = false;
        this.viewLoading = false;
        this.isShowMissed = false;
        this.branch = [];
        this.pinCodeChangePermission = false;

        this.today = DateTimeHelper.getUtcDate(DateTimeHelper.now());

        this.day = _.capitalize(DateTimeHelper.getDayName(DateTimeHelper.now())).substring(0, 3);

        this.date = moment(this.today).format('D');;

        this.month = _.capitalize(this.monthNames[new Date().getMonth()]).substring(0, 3);

        this.year = moment(this.today).format('YYYY');

        this.mobileNumber = '';
        this.pinCode = '';

        this.counter = 300;
        

    }

    // tslint:disable-next-line:typedef
    ngOnInit() {

        this._authService.clearAuthUser();

        this._kisokService
            .onBranchChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((branches: Branch) => {
                console.log('[branches]', branches);

                this.branch = branches[0];

                this.isShowMissed = this.branch?.center_settings?.enable_missed_attendance !== undefined? this.branch?.center_settings?.enable_missed_attendance : false;

                console.log('[branches]', this.branch);
            });

        this._kisokService
            .onUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {

                console.log('[user]', data);
                this.user = data.user;
                this.token = data.token;

                if (this.user) {

                    this.hasUserData = true
                    // this.children = this.user.children.map((v, idx)=> new Child(v, idx));
                }
                else {
                    this.hasUserData = false;
                }

                if (this.user && !_.isNull(this.token)) {
                    this.isLoged = true;
                    setTimeout(()=>{
                        this.sessionExpire()
                    },300000)
            
                    this.counter = 300;
                    this.countDown = timer(0, this.tick).subscribe(() => --this.counter);
                }
                else {
                    this.isLoged = false;
                }

                console.log(this.isLoged);


            });

        this._kisokService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {

                console.log('on child change working');

                this._logger.debug('[child]', data);
                this.allChildren = data;
                this.children = data.filter(v=> v.bookings.length > 0);

            });

            this._kisokService
            .onChildMissedChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {

                console.log('on missed change working');

                this._logger.debug('[missed]', data);

                this.missed = _.sortBy(data, attendance=> attendance.date)

                if(this.missed.length > 0 && this.isShowMissed){
                    
                    this.openDialog()
                }

            });

        this._kisokService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.viewLoading = value;

            });

        this._kisokService
            .onDestroyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[destroy]', value);

                if(value){
                    this.setRoomModal.destroy();
                }

            });
    }

    openDialog(): void {

        this.dialogRef = this._matDialog
            .open(GetMissedAttendanceComponent,
                {
                    panelClass: 'missed-attendance-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        data: this.missed,
                        children: this.allChildren
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message => {
                if (!message) {
                    return;
                }


                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar('Missed Attendance updated successfully', NotifyType.SUCCESS), 200);
            });

    }

    ngOnDestroy(): void{
        this.countDown=null;
        this._authService.clearAuthUser();
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    clearMobile(e: MouseEvent): void {
        e.preventDefault();

        this.mobile.patchValue('', { emitEvent: true });
    }

    clearPin(e: MouseEvent): void {
        e.preventDefault();

        this.pin_code.patchValue('', { emitEvent: true });
    }
    createkioskForm(): FormGroup {
        return new FormGroup({
            phone: new FormControl('', [Validators.required]),
            pin_code: new FormControl('', [Validators.required])
        });
    }

    
    enterKey(e: MouseEvent, value:any, isPin: boolean):void{
        e.preventDefault();

        if(!isPin){
            if(this.mobileNumber.length < 10){

                this.mobileNumber = `${this.mobileNumber}${value}`;
            }
        }
        else{

            this.pinCode = `${this.pinCode}${value}`
            
        }
        
    }
     deleteKey(e: MouseEvent, isPin: boolean){
        e.preventDefault();
        if(!isPin){

            this.mobileNumber = this.mobileNumber.slice(0,-1)
        }
        else{

            this.pinCode = this.pinCode.slice(0,-1)
        }
       
     }

     getpinCode():string{

        let hasStar = [];
        for(let number of this.pinCode.split('')){

            hasStar.push('*');
        }

        console.log(hasStar);
        
        return hasStar.join('');
     }

    getProfile(id: string): string {

        const child = this.children.find(v => v.index === id); 

        try
        {
           
            return child?.child_profile_image !== null ?  this._commonService.getS3FullLinkforProfileImage(child?.child_profile_image) : `assets/icons/flat/ui_set/custom_icons/child/${(child?.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
        }
        catch (err)
        {
            return AppConst.image.PROFILE_CALLBACK;
        }


    }

    getRoomTitle(child):string {

        const roomName = [];

            for (const room of child.rooms) {

                roomName.push(room.title)
            }

            return roomName.join(', ');


    }


    getDesc(child): string{

        let message = '';

        let booking = _.sortBy(child.bookings, booking => booking.session_start)[0];
        let hasNotCompletedBooking = child.bookings.filter(v=> v.attendance?.drop_time !== null && v.attendance?.pick_time === null);

            if(hasNotCompletedBooking.length > 0){

                return ``;
            }

            if(booking.status === '2'){

                message = 'Absence';
            }
            if(booking.status === '3'){

                message = 'Holiday';
            }

      return message;
        // return message;
    }

    showMessage(e: MouseEvent, child): any{

        e.preventDefault();

        if(child.bookings.length > 1){

            let isAllAbsent = child.bookings.filter(v=> v. status === '2');
            let isAllHoliday = child.bookings.filter(v=> v. status === '3');
            let hasDataToSignIn = child.bookings.filter(v=> v. attendance === null || v. attendance?.pick_time === null);
            let hasAbsentOrHolidayData = child.bookings.filter(v=> v. status === '2' || v. status === '2');

            if(isAllAbsent.length === child.bookings.length){

                setTimeout(() => {
                    this._notification.displayNotification(
                        'Warning',
                        `${child.full_name} is already marked as absent`,
                        NotifyMessageType.WARNING,
                        2000
                    );
                }, 500);
                return;
            }

            if(isAllHoliday.length === child.bookings.length){

                setTimeout(() => {
                    this._notification.displayNotification(
                        'Warning',
                        `${child.full_name} is already marked as holiday`,
                        NotifyMessageType.WARNING,
                        2000
                    );
                }, 500);
                return;
            }

            // if the child has not sign in or sign out data open the modal here 
            if(hasDataToSignIn.length > 0 && hasAbsentOrHolidayData.length > 0){

                let booking = child.bookings;
                this.setRoomModal = this._modalService
                        .create({
                            nzTitle: 'Select a booking',
                            nzContent: SetBookingComponent,
                            nzMaskClosable: false,
                            nzComponentParams: {
                                booking: _.sortBy(booking, booking => booking.session_start),
                                isAbsent: false,
                                model: this.setRoomModal,
                                child: child
                            },
                            nzWrapClassName: 'custom-search-list',
                            nzFooter: [
                                {
                                    label: 'SELECT',
                                    type: 'primary',
                                    disabled: componentInstance => !(componentInstance!.ChildSetRoomForm.valid),
                                    onClick: componentInstance => {
                                        const selectedRoom = componentInstance.getSelectedRoom();
        
                                        if (!_.isNull(selectedRoom)) {
                                            booking = selectedRoom;

                                            let hasNotCompletedBooking = child.bookings.filter(v => (v.attendance?.drop_time !== null && v.attendance?.pick_time === null)&&(v.index !== booking.index));
        
                                            let completed = false;
        
                                            if (booking.attendance !== null) {
        
                                                completed = (booking.attendance?.drop_time !== null &&  booking.attendance?.pick_time !== null);
                                            }

                                            if (completed) {
        
                                                setTimeout(() => {
                                                    this._notification.displayNotification(
                                                        'Warning',
                                                        `${child.full_name} has already had their attendance completed for booking`,
                                                        NotifyMessageType.WARNING,
                                                        2000
                                                    );
                                                }, 500);
        
                                                return;
                                            }

                                           
                                            if(booking.status === '2') {

                                                setTimeout(() => {
                                                    this._notification.displayNotification(
                                                        'Warning',
                                                        `This booking has been marked as absent`,
                                                        NotifyMessageType.WARNING,
                                                        2000
                                                    );
                                                }, 500);
                                                return;

                                            }

                                            if(booking.status === '3') {

                                                setTimeout(() => {
                                                    this._notification.displayNotification(
                                                        'Warning',
                                                        `This booking has been marked as holiday`,
                                                        NotifyMessageType.WARNING,
                                                        2000
                                                    );
                                                }, 500);
                                                return;
                                            }

                                            if (hasNotCompletedBooking.length > 0) {


                                                setTimeout(() => {
                                                    this._notification.displayNotification(
                                                        'Warning',
                                                        `Child already signed in with another session, please sign out first`,
                                                        NotifyMessageType.ERROR,
                                                        2000
                                                    );
                                                }, 500);
                                                return;
                                            }
                                            
                                            // open another model here
                                            this.dialogRef = this._matDialog
                                                .open(CreateAttendenceComponent,
                                                    {
                                                        panelClass: 'attendance-new-dialog',
                                                        closeOnNavigation: true,
                                                        disableClose: true,
                                                        autoFocus: false,
                                                        data: {
                                                            action: AppConst.modalActionTypes.NEW,
                                                            child: child,
                                                            booking: booking
                                                        }
                                                    });
        
                                            this.dialogRef
                                                .afterClosed()
                                                .pipe(takeUntil(this._unsubscribeAll))
                                                .subscribe(message => {
                                                    if (!message) {
                                                        return;
                                                    }
        
                                                    this._notification.clearSnackBar();
        
                                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                                });
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

            }
        }
        else{

            if(child.bookings[0].status === '2'){

                setTimeout(() => {
                    this._notification.displayNotification(
                        'Warning',
                        `${child.full_name} is already marked as absent`,
                        NotifyMessageType.WARNING,
                        2000
                    );
                }, 500);
                return;
            }

            if(child.bookings[0].status === '3'){

                setTimeout(() => {
                    this._notification.displayNotification(
                        'Warning',
                        `${child.full_name} is already marked as holiday`,
                        NotifyMessageType.WARNING,
                        2000
                    );
                }, 500);
                return;
            }
        }
    }

    //  status -> 0 - booked, 1 - attendance, 2 - absence, 3 - holiday

    signinTime(child):string {
        // 0 - normal, 1 - absence

        const sessionTime = [];
        let booking = _.sortBy(child.bookings, booking => booking.session_start)[0];
        let timeLable1 = '';
        let timeLable2 = '';

        let hasNotCompletedBooking = child.bookings.filter(v => v.attendance?.drop_time !== null && v.attendance?.pick_time === null);

        if (hasNotCompletedBooking.length > 0) {

            return `Sign in: ${this.timeTransform(hasNotCompletedBooking[0].attendance?.drop_time, '12h')}`
        }
        
        if (booking.attendance !== null) {

            if (booking.attendance?.drop_time !== null) {

                timeLable1 = `Sign in: ${this.timeTransform(booking.attendance?.drop_time, '12h')}`;
                sessionTime.push(timeLable1);
            }

            if (booking.attendance.pick_time !== null) {

                timeLable2 = ` - Sign out: ${this.timeTransform(booking.attendance.pick_time, '12h')}`
                sessionTime.push(timeLable2);

            }

            return sessionTime.join(' | ');
        }

        else {

            if(booking.status == "2" || booking.status == "3"){
                
                return '';
            }

            return 'Not signed in';

        }

    }

    timeTransform(value: number, type: string): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return 'N/A';
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';
        
        return `${h}:${m} ${a}`;
    }

    getClass(child): string {

        let className = '';
        let booking = _.sortBy(child.bookings, booking => booking.session_start)[0];

        let hasNotCompletedBooking = child.bookings.filter(v=> v.attendance?.drop_time !== null && v.attendance?.pick_time === null);

        let hasAbsentOnly = child.bookings.filter(v=> v.attendance === null && (v. status == 2 || v.status ==3));

            if(hasNotCompletedBooking.length > 0){

                return className = 'green';
            }

            else{

                if (booking.status == 2 || booking.status == 3 ||(hasAbsentOnly.lenght >0)) {

                    return className = 'gray';
    
                }
                else {

                    if (booking.attendance === null) {
    
                        return className = 'white';
    
                    }
    
                    if (booking.attendance?.drop_time !== null && booking.attendance?.pick_time !== null) {
    
    
                        return className = 'pink';
    
                    }
    
                    if (booking.attendance?.drop_time !== null && booking.attendance?.pick_time === null) {
    
                        return className = 'green';
                    }
    
    
    
                }
            }

            
            
            

    }

    isShowAbsentButton(child): boolean{

        let isShow = false;
        let booking = _.sortBy(child.bookings, booking => booking.session_start)[0];

        // if((booking.status !== '2' || booking.status !== '3') && booking.attendance === null){
        
        //     return true;

        // }
        
        if(child.bookings.length >1){

            isShow = child.bookings.filter(v=> v.attendance == null && (v.status !== '2' && v.status !== '3')).length > 0 ? true: false;

        }

        else{

            if(child.bookings[0].status !== '3' && child.bookings[0].status !== '2'){

                isShow =  child.bookings[0].attendance == null ? true : false;
            }
            

        }
        
        
        return isShow;
    }

    isShowSignInButton(child): boolean{

        let isShow = false;
        let booking = _.sortBy(child.bookings, booking => booking.session_start)[0];

        let hasNotCompletedBooking = child.bookings.filter(v=> v.attendance?.drop_time !== null && v.attendance?.pick_time === null);
        let hasAbsentOnly = child.bookings.filter(v=> v.attendance === null && (v. status == 2 || v.status ==3));

            if(hasNotCompletedBooking.length > 0){

                return isShow = true;
            }


            
            if (booking.status == 2 || booking.status == 3 || (hasAbsentOnly.length > 0)) {

                return isShow = false;

            }
            else {

                if (booking.attendance === null) {

                    return isShow = true;

                }

                if (booking.attendance?.drop_time !== null && booking.attendance?.pick_time !== null) {


                    return isShow = true;

                }

                if (booking.attendance?.drop_time !== null && booking.attendance?.pick_time === null) {

                    return isShow = true;
                }


            }
     

    }

    getButtonText(child, isType: boolean): string {

        let lable = '';
        let type = '';

        let booking = _.sortBy(child.bookings, booking => booking.session_start)[0];

        let hasNotCompletedBooking = child.bookings.filter(v=> v.attendance?.drop_time !== null && v.attendance?.pick_time === null);

        if (hasNotCompletedBooking.length > 0) {

            lable = 'Sign out';
            type = 'danger';
            return isType ? type : lable;

        }

        // console.log(child.first_name, hasAttendance);

        if (booking.attendance === null || (booking.attendance?.drop_time !== null && booking.attendance?.pick_time !== null)) {
            lable = 'Sign in';
            type = 'primary';
            return isType ? type : lable;

        }



    }


    getClientByMobile(e: MouseEvent): void {

        e.preventDefault();

        if(this.mobileNumber.length < 1){

            setTimeout(() => {
                this._notification.displayNotification(
                    'Warning',
                    `invalid mobile number.`,
                    NotifyMessageType.WARNING,
                    2000
                );
            }, 500);
            return;
        }
        this.buttonLoader = true;

        if (!this.hasUserData) {

            this._kisokService
                .getClientByMobile(this.mobileNumber)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this.buttonLoader = false, 200))
                )
                .subscribe(
                    res => {
                        console.log(res.data.pincode);
                        this.pinCodeCheck = res.data.pincode;
                        this.phoneCheck = res.data.phone;
                        this.kioskForm.reset();

                    },
                    error => {
                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );

        }

        else {

            const sendObj = {

                phone: this.mobileNumber,
                pincode: this.pinCode,
                type: 'parent',
                is_web: true

            };

            if(this.pinCode == '0000' && this.pinCodeCheck == null){

                console.log(this.pin_code.value);
                this.pin_code = new FormControl({ value: null, disabled: false });
                this.buttonLoader = false;
                this.pinCodeChangePermission = true;
                this.pinCode = '';
                setTimeout(() => {
                    this._notification.displayNotification(
                        'PIN RESET',
                        `You have request a pin reset. Please enter a new 4-8 digit pin.`,
                        NotifyMessageType.INFO,
                        2000
                    );
                }, 500);
                
            }
            else if(this.pinCodeChangePermission && this.pinCodeCheck == null){

                if(this.pinCode.length < 4 || this.pinCode.length > 8){

                    setTimeout(() => {
                        this._notification.displayNotification(
                            'Incorrect PIN',
                            `Please enter a new pin with 4-8 digits.`,
                            NotifyMessageType.WARNING,
                            2000
                        );
                    }, 500);

                    this.buttonLoader = false;
                    return;
                }
                this._kisokService
                .saveChangedPinCode(this.mobileNumber, this.pinCode)
                .pipe(
                    takeUntil(this._unsubscribeAll))
                .subscribe(
                    res => {
                        this.pin_code = new FormControl({ value: null, disabled: false });
                        this.buttonLoader = false;
                        setTimeout(() => {
                            this._notification.displayNotification(
                                'SUCCESS',
                                `You have successfully created a pin. Please now login using your new pin.`,
                                NotifyMessageType.SUCCESS,
                                2000
                            );
                        }, 500);
                        this.pinCodeChangePermission = false;
                        this.pinCode = '';
                        // this.viewLoading = false;
                        // this.kioskForm.reset();

                    },
                    error => {

                        this.viewLoading = false;
                        this.buttonLoader = false;
                        throw error;
                        
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );

            }
            else{

                this._kisokService
                .login(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll))
                .subscribe(
                    res => {

                        this.buttonLoader = false;
                        // this.viewLoading = false;
                        this.kioskForm.reset();

                    },
                    error => {

                        this.viewLoading = false;
                        this.buttonLoader = false;
                        throw error;
                        
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
            }
            
        }

    }

    refresh(e: MouseEvent): void{

        e.preventDefault();

        this.viewLoading = true;
        this._kisokService
        .getChildData()
        .pipe(
            takeUntil(this._unsubscribeAll))
        .subscribe(
            res => {

                this.viewLoading = false;

            },
            error => {

                this.viewLoading = false;
                throw error;
                
            },
            () => {
                this._logger.debug('😀 all good. 🍺');
            }
        );
       
    }

    addDialog(item, e: MouseEvent, isAbsent: boolean): void {

        e.preventDefault();
        let booking = item.bookings;
        const attendance = item.attendance;
        let hasDataToSignIn = item.bookings.filter(v => v.attendance === null || v.attendance?.pick_time === null);
        let hasAbsentOrHolidayData = item.bookings.filter(v => v.status === '2' || v.status === '2');
        let isChildHasMissed = this.missed.filter(v => v.child_id === item.chid_id);

        if (hasDataToSignIn.length > 0 && hasAbsentOrHolidayData.length > 0) {

            return;
        }



        if (item.bookings.length > 1) {


            this.setRoomModal = this._modalService
                .create({
                    nzTitle: 'Select a booking',
                    nzContent: SetBookingComponent,
                    nzMaskClosable: false,
                    nzComponentParams: {
                        booking: _.sortBy(booking, booking => booking.session_start),
                        isAbsent: isAbsent,
                        model: this.setRoomModal,
                        child: item
                    },
                    nzWrapClassName: 'custom-search-list',
                    nzFooter: [
                        {
                            label: 'SELECT',
                            type: 'primary',
                            disabled: componentInstance => !(componentInstance!.ChildSetRoomForm.valid),
                            onClick: componentInstance => {
                                const selectedRoom = componentInstance.getSelectedRoom();

                                if (!_.isNull(selectedRoom)) {
                                    booking = selectedRoom;

                                    let hasNotCompletedBooking = item.bookings.filter(v => (v.attendance?.drop_time !== null && v.attendance?.pick_time === null) && (v.index !== booking.index));

                                    let completed = false;



                                    if (booking.attendance !== null) {

                                        completed = (booking.attendance?.drop_time !== null && booking.attendance?.pick_time !== null);
                                    }

                                    if (completed) {

                                        setTimeout(() => {
                                            this._notification.displayNotification(
                                                'Warning',
                                                `${item.full_name} has already had their attendance completed for booking`,
                                                NotifyMessageType.WARNING,
                                                2000
                                            );
                                        }, 500);

                                        return;
                                    }

                                    if (booking.status === '2') {

                                        setTimeout(() => {
                                            this._notification.displayNotification(
                                                'Warning',
                                                `This booking has been marked as absent`,
                                                NotifyMessageType.WARNING,
                                                2000
                                            );
                                        }, 500);
                                        return;

                                    }

                                    if (booking.status === '3') {

                                        setTimeout(() => {
                                            this._notification.displayNotification(
                                                'Warning',
                                                `This booking has been marked as holiday`,
                                                NotifyMessageType.WARNING,
                                                2000
                                            );
                                        }, 500);
                                        return;
                                    }

                                    if (hasNotCompletedBooking.length > 0) {

                                        setTimeout(() => {
                                            this._notification.displayNotification(
                                                'Warning',
                                                `Child already signed in with another session, please sign out first`,
                                                NotifyMessageType.ERROR,
                                                2000
                                            );
                                        }, 500);
                                        return;
                                    }


                                    // open another model here
                                    this.dialogRef = this._matDialog
                                        .open(CreateAttendenceComponent,
                                            {
                                                panelClass: 'attendance-new-dialog',
                                                closeOnNavigation: true,
                                                disableClose: true,
                                                autoFocus: false,
                                                data: {
                                                    action: AppConst.modalActionTypes.NEW,
                                                    child: item,
                                                    booking: booking
                                                }
                                            });

                                    this.dialogRef
                                        .afterClosed()
                                        .pipe(takeUntil(this._unsubscribeAll))
                                        .subscribe(message => {
                                            if (!message) {
                                                return;
                                            }

                                            this._notification.clearSnackBar();

                                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                        });
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

        }

        else {

            booking = item.bookings[0];

            if (isAbsent) {

                const sendObj = {
                    child_id: JSON.stringify([booking.child_id]),
                    type: 1,
                    booking_id: JSON.stringify([booking.index]),
                    drop_geo_coordinates: '',
                    absence_reason: 'NONE'

                };

                // open confir dialog
                this.confirmModal = this._modalService
                    .confirm(
                        {
                            nzTitle: 'Confirm!',
                            nzContent: `Are you sure you whould like to mark ${item.full_name}  Absent.`,
                            nzWrapClassName: 'vertical-center-modal',
                            nzOkText: 'Yes',
                            nzOkType: 'danger',
                            nzOnOk: () => {
                                return new Promise((resolve, reject) => {
                                    this._kisokService
                                        .createAttendance(sendObj, false)
                                        .pipe(
                                            takeUntil(this._unsubscribeAll),
                                            finalize(() => resolve())
                                        )
                                        .subscribe(
                                            message => {
                                                setTimeout(() => this._notification.displaySnackBar('Succesfully updated', NotifyType.SUCCESS), 200);


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

            else {


                let completed = false;

                if (booking.attendance !== null) {

                    completed = (booking.attendance?.drop_time !== null && booking.attendance?.pick_time !== null);
                }

                if (completed) {

                    setTimeout(() => {
                        this._notification.displayNotification(
                            'Warning',
                            `${item.full_name} has already had their attendance completed for booking`,
                            NotifyMessageType.WARNING,
                            5000
                        );
                    }, 500);

                    return;
                }

                this.dialogRef = this._matDialog
                    .open(CreateAttendenceComponent,
                        {
                            panelClass: 'attendance-new-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                child: item,
                                booking: booking
                            }
                        });

                this.dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(message => {
                        if (!message) {
                            return;
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    });


            }



        }
        setTimeout(() => this.viewLoading = false, 500);




    }

    get fc(): any {
        return this.kioskForm.controls;
    }

    exit(): void {

        this.viewLoading = true;
        this.user = null,
        this.children = [];
        this.isLoged = false;
        this.hasUserData = false;
        this.token = null;
        this.pinCodeChangePermission = false;

        this.mobileNumber = '';
        this.pinCode = '';
        this.counter = 0;
        // this.pin_code.patchValue('', { emitEvent: true });
        // this.mobile.patchValue('', { emitEvent: true });
        this._authService.clearAuthUser();
        setTimeout(() => this.viewLoading = false, 1000);
       
    }

    sessionExpire(): void{
        this.dialogRef.close();
        this.exit();
        this._router.navigateByUrl(`/login`);

    }

    onLongPress() {
        console.log('press');
        
      }
    
      onLongPressing() {
        console.log('pressing');
        
      }
}

@Pipe({
    name: "formatTime"
  })
  export class FormatTimePipe implements PipeTransform {
    transform(value: number): string {
      const minutes: number = Math.floor(value / 60);
      return (
        ("00" + minutes).slice(-2) +
        ":" +
        ("00" + Math.floor(value - minutes * 60)).slice(-2)
      );
    }
  }
