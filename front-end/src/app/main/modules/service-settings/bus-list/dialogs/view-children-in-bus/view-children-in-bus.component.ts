import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { FormControl, FormGroup, Validators, FormArray, ValidatorFn } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { helpMotion } from 'ng-zorro-antd';

import { NotificationService } from 'app/shared/service/notification.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import { Branch } from 'app/main/modules/branch/branch.model';

import { CommonService } from 'app/shared/service/common.service';
import { valueExists } from 'app/shared/validators/asynValidator';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';

import {differenceInCalendarDays} from 'date-fns';
import {Child} from '../../../../child/child.model';
import {BusListService} from '../../services/bus-list.service';
import { Bus } from '../../bus-list.model';
import { School } from '../../school-list.model';



@Component({
    selector: 'buslist-view-children-in-bus',
    templateUrl: './view-children-in-bus.component.html',
    styleUrls: ['./view-children-in-bus.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 1000 }),
        fadeOutOnLeaveAnimation({ duration: 2000 })
    ]
})
export class ViewChildrenInBusComponent implements OnInit, OnDestroy
{
    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    childrenForm: FormGroup;
    editMode = false;
    buttonLoader = false;

    showAlert = false;
    selectedChildren: Child[];
    allChildrenList: Child[];
    schoolList: School[];
    bus: Bus;
    size: any = 'large';


    /* table */
    tableLoading: boolean;
    Capacity: any[];
    total: number;


    /**
     * Constructor
     *
     * @param {MatDialogRef<NewOrEditComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param _busListService
     * @param _commonService
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ViewChildrenInBusComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _busListService: BusListService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug('[room data]', _data);
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;

        this.selectedChildren = _data.response.selectedChildren;
        // this.allChildrenList = _data.response.allChildren;
        this.schoolList = _data.response.schoolList;
        this.bus = _data.response.bus;

        // table
        this.tableLoading = false;


        this.createChildrenForm();


    }


ngOnInit(): void {
        // this.childrenForm.get('child_ids').patchValue((this._data.response.selectedChildren) ? this.selectedChildren.map(({ id }) => id) : null, { emitEvent: false });
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {
        return this.childrenForm.controls;
    }

    createChildrenForm(): void {
        this.childrenForm = new FormGroup({
            // title: new FormControl(this.editMode ? this._data.response.roomRes.title : '', [Validators.required, Validators.minLength(3)]),
            child_ids: new FormControl(null, [Validators.required]),
            school: new FormControl(null, [Validators.required])

        });
    }
    


    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();


    }


    /*removed after the room id was also applied to buslit*/
   /* addChildren(e: MouseEvent): void
    {
       e.preventDefault();
       if(this.childrenForm.invalid)
       {
           return;
       }
       const sendObj = {
           bus_id: this.bus.id,
           child_id: this.fc.child_ids.value,
           school_id: this.fc.school.value
       }

        this._busListService.addChildrenToBus(sendObj, this.bus.id, null)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;
                    this.selectedChildren = (res.data) ? res.data.map((i: any, idx: number) => new Child(i, idx)) : null;
                    this._notification.displaySnackBar(res.message, NotifyType.SUCCESS)

                },
                error => {
                    this.buttonLoader = false;
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
        /!*   if(!this.fc.capacity.value)
          {

              return;
          }
          if (this.roomForm.invalid) {
              return;
          }
          const sendObj = {
              capacity: this.fc.capacity.value,
              effectiveDate: (this.fc.effectiveDate.value)? DateTimeHelper.getUtcDate(this.fc.effectiveDate.value) : DateTimeHelper.getUtcDate(new Date()),
          };

          if (this.editMode) { sendObj['id'] = this._data.response.roomRes.id; }

          this._logger.debug('[room object]', sendObj);

          this.buttonLoader = true;

          this._roomService.addCapacity(sendObj)
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe(
                  res => {
                      this.buttonLoader = false;
                      this.Capacity = res;
                      this.roomForm.get('capacity').patchValue(null, { emitEvent: false });
                      this.roomForm.get('effectiveDate').patchValue(null, { emitEvent: false });

                  },
                  error => {
                      this.buttonLoader = false;
                      this.roomForm.get('capacity').patchValue(null, { emitEvent: false });
                      this.roomForm.get('effectiveDate').patchValue(null, { emitEvent: false });
                      throw error;
                  },
                  () => {
                      this._logger.debug('😀 all good. 🍺');
                  }
              );*!/
    }*/




}
