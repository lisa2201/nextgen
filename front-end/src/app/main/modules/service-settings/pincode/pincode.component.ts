import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { CommonService } from 'app/shared/service/common.service';
import { PincodeService } from './services/pincode.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { valueExists } from 'app/shared/validators/asynValidator';
import { NotificationService } from 'app/shared/service/notification.service';

@Component({
    selector: 'center-pincode',
    templateUrl: './pincode.component.html',
    styleUrls: ['./pincode.component.scss'],
    animations: [
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 300 }),
      fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PincodeComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    pincodeForm: FormGroup;
    pincode: string;
    branch_id: string;
  
    constructor(
      private _commonService: CommonService,
      private _PincodeService: PincodeService,
      private _notification: NotificationService,
    ) {
      this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

      this._PincodeService
        .onPincodetabShow
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {

          this.pincode = response.items.pincode;
          this.branch_id = response.items.branch_id;

          this.pincodeForm = this.createPincodeForm();
          this.setPincodeFormValues(); 
        });
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createPincodeForm(): FormGroup
    {
        return new FormGroup({            
            pincode: new FormControl('', [Validators.maxLength(20)]),
        });
    }

    /**
     * Set edit form values
     *
     */
    setPincodeFormValues(): void
    {
      try
      {        
          this.pincodeForm.get('pincode').setValue(this.pincode);

          // AsyncValidators fix
          setTimeout(() =>
          {
              this.pincodeForm.get('pincode').setAsyncValidators([valueExists(this._commonService, 'branch.pincode', this.branch_id)]);
          }, 500);

      }
      catch (err)
      {
          throw err;   
      }
    }
 

    /**
     * Form submit handler
     */
    onFormSubmit(): void {

      const formValues = this.pincodeForm.value;
      const sendData = {
        pincode: formValues.pincode
      };

      this._PincodeService.updatePincode(sendData)
        .pipe( )

        .subscribe((response: any) => {
            console.log(response);
            if (!response) {
              return;
            }

            if (response.code === 201) {
                setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
            }
            this._notification.clearSnackBar();
        });

    }

}
