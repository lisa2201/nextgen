import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { ServicePersonnelViewService } from '../../../../service/service-personnel-view-service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { ServicePersonnel } from '../../../../model/ServicePersonnel';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-add-wwcc-service-personnel',
    templateUrl: './add-wwcc-service-personnel.component.html',
    styleUrls: ['./add-wwcc-service-personnel.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddWwccServicePersonnelComponent implements OnInit {

    IssuingStateList = [
        {
            name: 'New South Wales',
            index: 0,
            value: 'NSW',
        },
        {
            name: 'Australian Capital Territory',
            index: 1,
            value: 'ACT',
        },
        {
            name: 'Western Australia',
            index: 2,
            value: 'WA',
        },
        {
            name: 'Queensland',
            index: 3,
            value: 'QLD',
        },
        {
            name: 'Victoria',
            index: 4,
            value: 'VIC',
        },
        {
            name: 'Tasmania',
            index: 5,
            value: 'TAS',
        },
        {
            name: 'Northern Territory',
            index: 6,
            value: 'NT',
        },
        {
            name: 'South Australia',
            index: 7,
            value: 'SA',
        },
    ];

    wwccForm: FormGroup;
    nameForm: FormGroup;
    buttonLoader: boolean;
    isNameMode: boolean;
    title: string;
    servicePersonnel: ServicePersonnel;
    private _unsubscribeAll: Subject<any>;
    constructor(
        private _logger: NGXLogger,
        private _servicePersonnelViewService: ServicePersonnelViewService,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<AddWwccServicePersonnelComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();
        this.servicePersonnel = _data.servicePersonnel;
        console.log(this.servicePersonnel);
        console.log(_data);
     }

    ngOnInit(): void {

        this.wwccForm = this.createWWCCForm();
    }

    createWWCCForm(): FormGroup {
        return new FormGroup({
            wwccInput: new FormArray([this.createWWCC()]),
        });

    }

    createWWCC(): FormGroup {
        return new FormGroup({
            cardNumber: new FormControl(null, []),
            issuingState: new FormControl(null, []),
            expiryDate: new FormControl(null),
        });
    }

    get fc(): any {

        return  this.wwccForm.controls;
    }

    trackByFn(index: number, item: any): number {
        return index;
    }


    onFormSubmit(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        console.log(this.wwccForm);

        const wwccObject = [];

        _.forEach(this.fc.wwccInput.value, (i) => {
            wwccObject.push({
                cardNumber: i.cardNumber,
                expiryDate:  DateTimeHelper.getUtcDate(i.expiryDate),
                issuingState: i.issuingState
            });
        });
        const sendObj = {
            id: this.servicePersonnel.id,
            wwcc: wwccObject,
        };

        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        // this._servicePersonnelViewService
        //     .addRole(sendObj)
        //     .pipe(takeUntil(this._unsubscribeAll))
        //     .subscribe(
        //         res => {
        //             this.buttonLoader = false;

        //             setTimeout(() => this.matDialogRef.close(res), 250);
        //         },
        //         error => {
        //             this.buttonLoader = false;

        //             throw error;
        //         },
        //         () => {
        //             this._logger.debug('😀 all good. 🍺');
        //         }
        //     );


    }

}
