import {Component, Inject, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { FormBuilder} from '@angular/forms';
import { Subject} from 'rxjs';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {Country} from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import {ActivatedRoute} from '@angular/router';
import {CommonService} from 'app/shared/service/common.service';
import {helpMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {CountryResolverService} from 'app/main/modules/waitlist-form-config/services/country-resolver.service';
import {NGXLogger} from 'ngx-logger';
import {takeUntil} from 'rxjs/operators';
import {AppConst} from 'app/shared/AppConst';

@Component({
    selector: 'app-view-waitlist',
    templateUrl: './view-waitlist.component.html',
    styleUrls: ['./view-waitlist.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ViewWaitlistComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;        // dialog title changes on edit/view
    currentYear: number;
    countriesList: Country[] = []; // Country Select
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
    waitlistInfo: any;
    attendanceString: any;
    countryName: any;
    waitlistInputList: any;
    type: string = AppConst.appStart.WAITLIST.NAME;

    /**
     * Constructor
     *
     * @param {MatDialogRef<RoleAddOrEditDialogComponent>} matDialogRef
     * @param _data
     */
    constructor(
        private _logger: NGXLogger,
        public matDialogRef: MatDialogRef<ViewWaitlistComponent>,
        private _formBuilder: FormBuilder,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
        public _countryResolverService: CountryResolverService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {
        // Set the defaults
        this.currentYear = new Date().getFullYear();
        this.dialogTitle = 'View Waitlist'; // dialog title changes on edit or view
        this.countryName = 'N/A';
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this._setInitData();
        this._setScrollDirective();
        this.waitlistInfo = this._data.response.waitlist.waitlist_info;
        this.attendanceString = (this.waitlistInfo.attendance) ? Array.prototype.map.call(this.waitlistInfo.attendance, function (item) {
            return item.name;
        }).join(', ') : 'N/A';
        this.waitlistInputList = _.sortBy(this.waitlistInfo.section_inputs['waitlist'], 'order');
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    _setScrollDirective(): void {
        this._commonService.verticalLayout1ScrollDirective
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((directive: FusePerfectScrollbarDirective | null) => {
                this.scrollDirective = directive;
            });
    }

    getCountryName(): void {
        if (this._data.response.waitlist.waitlist_info.parent_country) {
            this.countryName = this.countriesList.find(e => e.code === this._data.response.waitlist.waitlist_info.parent_country);
        }
    }

    /**
     * Set select data
     */
    _setInitData(): void {
        this._countryResolverService
            .resolve()
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value: any) => {
                this.countriesList = value[0];
                this.getCountryName();
            })
    }

    SortingObject = (a, b) => {
        return a.key > b.key ? -1 : 1;
    }



}
