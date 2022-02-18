import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs/internal/Subject';
import { valueExists } from 'app/shared/validators/asynValidator';
import { CommonService } from 'app/shared/service/common.service';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';

@Component({
  selector: 'report-theme-select',
  templateUrl: './report-theme-select.component.html',
  styleUrls: ['./report-theme-select.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class  ReportThemeSelectComponent implements OnInit{

    private _unsubscribeAll: Subject<any>;
    saveReportSetForm: FormGroup;
    editMode: boolean;

    @Input('type')
    set type(value: string)
    {
        this.editMode = _.isString(value) && value === AppConst.modalActionTypes.EDIT;
    }
    @Input() name: string;
    themeList = [
        {
            index: 'grid',
            name: 'Grid'
        },
        {
            index: 'striped',
            name: 'Striped'
        },
        {
            index: 'plain',
            name: 'Plain'
        },
    ];
  constructor(
    private _commonService: CommonService,
  ) {

    this.editMode = false;
    this.saveReportSetForm = this.createForm();
  }

  ngOnInit() {
    this.saveReportSetForm
    .get('name')
    .patchValue(this.editMode ? this.name : '');
      
  }

  getValues(): any
    {
        return {
            name: this.fc.name.value,
        };    
    }

    createForm(): FormGroup
    {
        return new FormGroup({
            name: new FormControl(this.editMode ? this.name : '',[Validators.required],[valueExists(this._commonService, 'reportAddon.name')])
        });
    }

    get fc(): any 
    { 
        return this.saveReportSetForm.controls; 
    }

    // ngOnDestroy(): void
    // {
    //     Unsubscribe from all subscriptions
    //     this._unsubscribeAll.next();
    //     this._unsubscribeAll.complete();
    // }

}
