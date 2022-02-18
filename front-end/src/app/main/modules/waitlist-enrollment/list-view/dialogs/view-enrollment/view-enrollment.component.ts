import {Component, Inject, OnInit, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {fuseAnimations} from '@fuse/animations';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {AppConst} from 'app/shared/AppConst';
import {helpMotion} from 'ng-zorro-antd';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import * as _ from 'lodash';

@Component({
    selector: 'app-view-enrollment',
    templateUrl: './view-enrollment.component.html',
    styleUrls: ['./view-enrollment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ViewEnrollmentComponent implements OnInit {

    dialogTitle: string;        // dialog title changes on edit/view
    allergiesList: any[];
    waitlistInfo: any;
    enrolmentInputList: any;
    type: string = AppConst.appStart.ENROLLMENT.NAME;
    // common
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive

    /**
     * Constructor
     *
     * @param {MatDialogRef<RoleAddOrEditDialogComponent>} matDialogRef
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ViewEnrollmentComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {
        this.dialogTitle = 'View Enrollment'; // dialog title changes on edit or view
        this.waitlistInfo = this._data.response.waitlist.waitlist_info;
    }


    ngOnInit(): void {
        this.allergiesList = this._data.response.allergyTypes;
        /*console.log(this.allergiesList);
        console.log(this.waitlistInfo.allergiesArray);*/
        if (this._data.response.allergyTypes) {
            for (const key in this.waitlistInfo.allergiesArray) {
                this.waitlistInfo.allergiesArray[key]['name'] = !_.isEmpty(this.allergiesList.find(x => x.index === this.waitlistInfo.allergiesArray[key].allergies)?.name) ? this.allergiesList.find(x => x.index === this.waitlistInfo.allergiesArray[key].allergies).name : 'Allergy type not in system';
                //  console.log(this.allergiesList.find(x => x.index === this.waitlistInfo.allergiesArray[key].allergies));
            }
        }
        this.enrolmentInputList = _.sortBy(this.waitlistInfo.section_inputs['enrolment'], 'order');
    }
}
