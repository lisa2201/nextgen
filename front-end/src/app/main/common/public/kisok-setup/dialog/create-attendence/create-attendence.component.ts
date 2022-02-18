import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { CommonService } from 'app/shared/service/common.service';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { finalize } from 'rxjs/operators';
import { KisokService } from '../../service/kisok.service';

@Component({
  selector: 'app-create-attendence',
  templateUrl: './create-attendence.component.html',
  styleUrls: ['./create-attendence.component.scss'],
  encapsulation: ViewEncapsulation.None,

  
})
export class CreateAttendenceComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    
    child: any;
    booking: any;
    signForm: FormGroup;
    buttonLoader: boolean;

  constructor(
    public matDialogRef: MatDialogRef<CreateAttendenceComponent>,
    private _logger: NGXLogger,
    @Inject(MAT_DIALOG_DATA) private _data: any,
    private _kisokService: KisokService,
    private _commonService: CommonService,
  ) 
  { 
    this._logger.debug('[branch data]', _data);
    this.child = _data.child;
    this.booking = _data.booking;
    this.signForm = this.createForm();
    this.buttonLoader = false;

    this._unsubscribeAll = new Subject();



  }

  ngOnInit() {
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
}

getLable(isLable: boolean):any {

    let lable = 'SIGN IN';
    let dissable = false;

    if(!_.isNull(this.booking.attendance)){

        if(!_.isNull(this.booking.attendance.drop_time) && !_.isNull(this.booking.attendance.pick_time)){

            lable = 'SIGN OUT';
            dissable = true;
            
        }
        else{

            lable = 'SIGN OUT';

        }
        
    }


    return isLable? lable : dissable;

}

createForm(): FormGroup
    {
        return new FormGroup({
            desc: new FormControl('', [Validators.maxLength(250)]),
            time: new FormControl(null, [])
        });
    }

    
    get fc(): any
    {
        return this.signForm.controls;
    }

    getFeeData(){

      return `${this.booking.fee.fee_name} ($${this.booking.fee_amount})`

    }

  getBookingData(){

    return `${this.timeTransform(this.booking.session_start,'12h')} - ${this.timeTransform(this.booking.session_end,'12h')}`;

   }

    timeTransform(value: number, type: string): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return null;
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';
        
        return `${h}:${m} ${a}`;
    }

    timeTo24(time: string) {

        // time: "1:30 PM"
        if(time){

            time.trim();

        if(time.search('AM') !== -1){

            
            return time.replace('AM','').trim();
        }
        else{

            let arrayTime = time.split(':');
                
            let h = parseInt(arrayTime[0])
            let m = parseInt(arrayTime[1].replace('PM',''));

            let hf = h+12;
            
            return `${hf}:${m}`;
        }

        }
        else{
            return null;
        }
        

    }


    onFormSubmit(e: MouseEvent){

        e.preventDefault();

        if (this.signForm.invalid)
        {
            return;
        }

        const sendObj = {
            child_id: JSON.stringify([this.child.chid_id]),
            type: 0,
            booking_id: JSON.stringify([this.booking.index]),
            drop_geo_coordinates: '',
            remark: this.fc.desc.value,
            time: this.timeTo24(this.timeTransform(this.fc.time.value, '24h'))

        };

        if(!_.isNull(this.booking.attendance)){

            sendObj['attendance_ids'] = JSON.stringify([this.booking.attendance.index]);
        }

        this._logger.debug('[branch object]', sendObj);

        this.buttonLoader = true;

        this._kisokService
            .createAttendance(sendObj, false)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                res =>
                {
                    // this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
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
