import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { CommonService } from 'app/shared/service/common.service';
import { EducatorRatioService } from './services/educator-ratio.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { valueExists } from 'app/shared/validators/asynValidator';
import { NotificationService } from 'app/shared/service/notification.service';
import {AuthService} from '../../../../shared/service/auth.service';

@Component({
    selector: 'service-settings-educator-ratio',
    templateUrl: './educator-ratio.component.html',
    styleUrls: ['./educator-ratio.component.scss'],
    animations: [
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 300 }),
      fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class EducatorRatioComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    educatorRatioForm: FormGroup;
    educatorRatio: any;
    states: any;
    branchDetails: any;
    filteredStateRatio: any;
    filteredandDisabledStateRatio: any;
    branchDataResponse: any;
    TASStateSelected: boolean;
    WAStateSelected: boolean;

    WAStateKindergatenInput: boolean;
    TASStatePreschoolProgramInput: boolean;

    WAStatePreschoolProgramTickbox: boolean;
    TASStatePreschoolProgramTickbox: boolean;

    constructor(
      private _commonService: CommonService,
      private _PincodeService: EducatorRatioService,
      private _notification: NotificationService,
      private _auth: AuthService,
    ) {
      this._unsubscribeAll = new Subject();
      this.branchDetails = this._auth.getClient();
      this.filteredandDisabledStateRatio = [];

      this.TASStateSelected = false;
      this.WAStateSelected = false;

      this.WAStateKindergatenInput  = false;
      this.TASStatePreschoolProgramInput = false;

      this.WAStatePreschoolProgramTickbox = false;
      this.TASStatePreschoolProgramTickbox = false;
    }

    ngOnInit(): void {

      this.filteredStateRatio = null;
      this._PincodeService
        .onEducatorRatiotabShow
          .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {

          this.educatorRatio = response.items;
          this.states = response.states;
          this.branchDataResponse = response.branch;
          this.createEducatorRatioForm();
          this.setEducatorRatioFormValues();
        });
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createEducatorRatioForm(): void
    {

        this.educatorRatioForm = new FormGroup({
            state : new FormControl(),
        });
    }

    /**
     * Set edit form values
     *
     */
    setEducatorRatioFormValues(): void
    {
      try
      {        
          if(this.branchDataResponse)
          {
              this.educatorRatioForm.get('state').setValue(this.branchDataResponse.state);

              this.filteredStateRatio = this.educatorRatio.filter(item => item.state === this.branchDataResponse.state);
              for (const filteredStateRatioKey in this.filteredStateRatio) {
                  if(this.branchDataResponse.center_ratio.find(item => item.id === this.filteredStateRatio[filteredStateRatioKey].id))
                      this.filteredStateRatio[filteredStateRatioKey].selected = true;
                  else
                      this.filteredStateRatio[filteredStateRatioKey].selected = false;
              }

              this.filteredandDisabledStateRatio = this.filteredStateRatio.filter(x => x.selected === true);

              if(this.branchDataResponse.state==='TAS')
              {
                  this.TASStateSelected = true;
                  this.TASStatePreschoolProgram(this.branchDataResponse.preschool_program);
                  if(this.branchDataResponse.preschool_program)
                      this.TASStatePreschoolProgramTickbox = true;
              }
              if(this.branchDataResponse.state==='WA')
              {
                  this.WAStateSelected = true;
                  this.WAStatePreschoolProgram(this.branchDataResponse.kindergarten_attendance)
                  if(this.branchDataResponse.kindergarten_attendance)
                      this.WAStatePreschoolProgramTickbox = true;
              }
          }
      }
      catch (err)
      {
          throw err;   
      }
    }

    displayRatios(e): void
    {

        this.filteredStateRatio = this.educatorRatio.filter(item => item.state === e);
        this.filteredStateRatio.forEach((ratio,index)=>
        {
           this.filteredStateRatio[index].visibility = true;
        });
        this.filteredandDisabledStateRatio = [];
        if(e === 'TAS')
        {
            this.TASStateSelected = true;
            this.TASStatePreschoolProgram(false);
        }
        else
        {
            this.TASStateSelected = false;
        }
        if(e === 'WA')
        {
            this.WAStateSelected = true;
            this.WAStatePreschoolProgram(false);
        }
        else
        {
            this.WAStateSelected = false;
        }
    }

    removeAgeGroup(e,item): void
    {
        if(e===true)
            this.filteredandDisabledStateRatio.push(item);
        else
            this.filteredandDisabledStateRatio = this.filteredandDisabledStateRatio.filter(x => x !== item);

        console.log(this.filteredandDisabledStateRatio);
    }
    TASStatePreschoolProgram(e): void
    {
        console.log('TAS SElected? '+ this.TASStateSelected);
        console.log(e);
        if(e===true)
        {
            this.TASStatePreschoolProgramInput = true;
            this.filteredStateRatio.forEach((ratio, index) =>
            {
                this.filteredStateRatio[index].visibility = true;
                if(ratio.state === 'TAS' && ratio.age_group.includes('36 months upto and including preschool age') && !ratio.age_group.includes('for children attending a preschool program'))
                {
                    this.filteredStateRatio[index].visibility = false;
                    this.filteredStateRatio[index].selected = false;
                }
            });
            this.filteredandDisabledStateRatio.forEach((ratio, index) =>
            {
                if(ratio.state === 'TAS' && ratio.age_group.includes('36 months upto and including preschool age') && !ratio.age_group.includes('for children attending a preschool program'))
                {
                    this.filteredandDisabledStateRatio.splice(index, 1);
                }
            });

        }
        if(e===false)
        {
            this.TASStatePreschoolProgramInput = false;
            this.filteredStateRatio.forEach((ratio, index) =>
            {
                this.filteredStateRatio[index].visibility = true;
                if(ratio.state === 'TAS' && ratio.age_group.includes('36 months upto and including preschool age (for children attending a preschool program)'))
                {
                    this.filteredStateRatio[index].visibility = false;
                    this.filteredStateRatio[index].selected = false;
                }
            })
            this.filteredandDisabledStateRatio.forEach((ratio,index)=>
            {
                if(ratio.state === 'TAS' && ratio.age_group.includes('36 months upto and including preschool age (for children attending a preschool program)'))
                {
                    this.filteredandDisabledStateRatio.splice(index, 1);
                }
            })
        }
        console.log(this.filteredandDisabledStateRatio);
    }
    WAStatePreschoolProgram(e): void
    {
        console.log('WA SElected? '+ this.WAStateSelected);
        console.log(e);
        if(e===true)
        {
            this.WAStateKindergatenInput = true;
            this.filteredStateRatio.forEach((ratio, index) =>
            {
                this.filteredStateRatio[index].visibility = true;
                if(ratio.state === 'WA' && ratio.age_group.includes('Over preschool age') && !ratio.age_group.includes('if kindtergaten children are in attendance'))
                {
                    this.filteredStateRatio[index].visibility = false;
                    this.filteredStateRatio[index].selected = false;
                }
            });
            this.filteredandDisabledStateRatio.forEach((ratio, index) =>
            {
               if(ratio.state === 'WA' && ratio.age_group.includes('Over preschool age') && !ratio.age_group.includes('if kindtergaten children are in attendance'))
               {
                   this.filteredandDisabledStateRatio.splice(index, 1);
               }
            });

        }
        if(e===false)
        {
            this.WAStateKindergatenInput  = false;
            this.filteredStateRatio.forEach((ratio, index) =>
            {
                this.filteredStateRatio[index].visibility = true;
                if(ratio.state === 'WA' && ratio.age_group.includes('Over preschool age (if kindtergaten children are in attendance)'))
                {
                    this.filteredStateRatio[index].visibility = false;
                    this.filteredStateRatio[index].selected = false;
                }
            })
            this.filteredandDisabledStateRatio.forEach((ratio,index)=>
            {
                if(ratio.state === 'WA' && ratio.age_group.includes('Over preschool age (if kindtergaten children are in attendance)'))
                {
                    this.filteredandDisabledStateRatio.splice(index, 1);
                }
            })
        }
        console.log(this.filteredandDisabledStateRatio);
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.educatorRatioForm.controls;
    }

    /**
     * Form submit handler
     */
    onFormSubmit(): void {

      const sendData = {
        state: this.fc.state.value,
        branch_id: this.branchDetails.id,
        ratio: this.filteredandDisabledStateRatio,
        TASStatePreschoolProgramInput: this.TASStatePreschoolProgramInput,
        WAStateKindergatenInput : this.WAStateKindergatenInput
      };

      this._PincodeService.updateState(sendData)
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
