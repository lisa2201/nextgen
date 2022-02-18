import { Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { KisokService } from '../../service/kisok.service';

@Component({
  selector: 'app-set-booking',
  templateUrl: './set-booking.component.html',
  styleUrls: ['./set-booking.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SetBookingComponent implements OnInit, OnDestroy {

   // Private
   private _unsubscribeAll: Subject<any>;

   ChildSetRoomForm: FormGroup;
   buttonLoader: boolean;
   searchProperties: string[] = [
       'day',
       'fee_amount',
   ];

   @Input() booking: any;
   @Input() isAbsent: boolean;
   @Input() model: NzModalRef;
   confirmModal: NzModalRef;
   @Input() child: any;

   @ViewChild(FusePerfectScrollbarDirective)
   directiveScroll: FusePerfectScrollbarDirective;

   /**
    * Constructor
    * 
    * @param {NGXLogger} _logger
    * @param {NzModalRef} _modal
    */
   constructor(
       private _logger: NGXLogger,
       private _modal: NzModalRef,
       private _modalService: NzModalService,
       private _kisokService: KisokService,
       private _notification: NotificationService,
       private _commonService: CommonService,
   )
   {
       // set default values
       this.buttonLoader = false;
       this.ChildSetRoomForm = this.createForm();
       
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
       this._logger.debug('child set room modal !!!');

       if (this.booking.length < 1)
       {
           this.ChildSetRoomForm.disable();
       }
       else
       {
           this.onChanges();
       }
   }

   getProfile(): string {

    try
    {
        // return item.image 
        // ? this._commonService.getS3FullLinkforProfileImage(item.image)
        // : `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`
        return this.child?.child_profile_image !== null ?  this._commonService.getS3FullLinkforProfileImage(this.child?.child_profile_image) : `assets/icons/flat/ui_set/custom_icons/child/${(this.child?.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
    catch (err)
    {
        return AppConst.image.PROFILE_CALLBACK;
    }

    // return (child?.child_profile_image !== null) ? child?.child_profile_image : `assets/icons/flat/ui_set/custom_icons/child/${(child?.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;

}

   onChanges(): void
   {
       // Subscribe to search input changes
       this.ChildSetRoomForm
           .get('search')
           .valueChanges
           .pipe(takeUntil(this._unsubscribeAll))
           .subscribe(() => this.updateListScroll());
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
    * convenience getter for easy access to form fields
    */
   get fc(): any 
   { 
       return this.ChildSetRoomForm.controls; 
   }

   /**
    * Create compose form
    *
    * @returns {FormGroup}
    */
   createForm(): FormGroup
   {
       return new FormGroup({
           room: new FormControl(null, [Validators.required]),
           search: new FormControl(''),
       });
   }

   /**
    * clear search text
    *
    * @param {MouseEvent} e
    */
   clear(e: MouseEvent): void
   {
       e.preventDefault();

       this.fc.search.patchValue('', { emitEvent: false });
   }

   updateListScroll(): void
   {
       if ( this.directiveScroll )
       {
           this.directiveScroll.update(true);
       }
   }

   getSelectedRoom(): any
   {
       return (this.ChildSetRoomForm.valid) ? this.booking.find(i => i.index === this.fc.room.value) : null;
   }

   destroyModal(): void
   { 
       this._modal.destroy();
   }

   getFeeData(item):string {

        return `${item.fee.fee_name} ($${item.fee_amount})`

   }

   getDesc(booking): string{

    let message = '';


        if(booking.status === '0'){

            message = 'booked';
        }

        if(booking.status === '1'){

            message = 'attendance';
        }

        if(booking.status === '2'){

            message = 'absence';
        }
        if(booking.status === '3'){

            message = 'holiday';
        }

        return message;
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

    getSignInData(item):string {

         //  status -> 0 - booked, 1 - attendance, 2 - absence, 3 - holiday

        const text = [];

        if(item.status == 2){

            return 'absence';
        }
        if(item.status == 3){

            return 'holiday';

        }

        if(item.attendance){

            const picTime = item.attendance.pick_time;
            const dropTime = item.attendance.drop_time;

            if(!_.isNull(dropTime)) {
                
                text.push(`Sign in: ${this.timeTransform(dropTime, '12h')}`);
            }

            if(!_.isNull(picTime)){

                text.push(`out: ${this.timeTransform(picTime, '12h')}`);
            }

            return text.join('-');

        }

        else{

            return 'Not Sign in';

        }
    }

    absent( e: MouseEvent, booking){

        e.preventDefault();
        
        if(booking.attendance !== null){
            // setTimeout(() => {
            //     this._notification.displayNotification(
            //         'Warning',
            //         `${item.full_name} has already had their attendance completed for booking`,
            //         NotifyMessageType.WARNING,
            //         5000
            //     );
            // }, 500);

            return;
        }
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
                nzContent: `Are you sure you whould like to mark ${this.child.full_name}  Absent.`,
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Yes',
                nzOkType: 'danger',
                nzOnOk: () =>
                {
                    return new Promise((resolve, reject) =>
                    {
                        this._kisokService
                            .createAttendance(sendObj, true)
                            .pipe(
                                takeUntil(this._unsubscribeAll),
                                finalize(() => resolve())
                            )
                            .subscribe(
                                message =>
                                {
                                    setTimeout(() => {
                                        this.model.destroy();
                                        this._notification.displaySnackBar('Succesfully updated', NotifyType.SUCCESS)
                                    }, 200);

                                    
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

}
