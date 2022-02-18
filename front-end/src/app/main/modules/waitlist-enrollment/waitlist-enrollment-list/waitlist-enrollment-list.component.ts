import {Component, OnInit} from '@angular/core';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {WaitlistEnrollment} from './waitlist-enrollment.model';
import {WaitListEnrollmentService} from '../service/waitlist-enrollment.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {analyzeAndValidateNgModules} from '@angular/compiler';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {UsersService} from '../../user/services/users.service';
import {Router} from '@angular/router';
import {AuthService} from 'app/shared/service/auth.service';
import {AppConst} from 'app/shared/AppConst';
import * as _ from 'lodash';
import {FuseSidebarService} from '@fuse/components/sidebar/sidebar.service';

@Component({
    selector: 'app-waitlist-enrollment-list',
    templateUrl: './waitlist-enrollment-list.component.html',
    styleUrls: ['./waitlist-enrollment-list.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})


export class WaitlistEnrollmentListComponent {

    [x: string]: any;

    //   Waitlist: WaitlistEnrollment[] = [
    //     new WaitlistEnrollment({child_name: 'Aarma Rayeds-enrollment/waitlist-enrollment-list/waitlist-enrollment-list.co', age: '2 Years 5 Monthsewfsfeasae', parent_name: 'Andrew Symond nrollment/waitlist-enrollment-list/waitlist-enrollment-lis', status: 'Waiting', enrollement_date:'2019-10-20'}),
    //     new WaitlistEnrollment({child_name: 'Aarma Rayeds-enrollment/waitlist-enrollment-list/waitlist-enrollment-list.co', age: '2 Years 5 Monthswerweweaae', parent_name: 'Andrew Symond nrollment/waitlist-enrollment-list/waitlist-enrollment-lis', status: 'Waiting', enrollement_date:'2019-10-20'}),
    //     new WaitlistEnrollment({child_name: 'Aarma Rayeds-enrollment/waitlist-enrollment-list/waitlist-enrollment-list.co', age: '2 Years 5 Monthewfefwses', parent_name: 'Andrew Symond nrollment/waitlist-enrollment-list/waitlist-enrollment-lis', status: 'Waiting', enrollement_date:'2019-10-20'}),
    //     new WaitlistEnrollment({child_name: 'Aarma Rayeds-enrollment/waitlist-enrollment-list/waitlist-enrollment-list.co', age: '2 Years 5 Monthsdfsss', parent_name: 'Andrew Symond nrollment/waitlist-enrollment-list/waitlist-enrollment-lis', status: 'Waiting', enrollement_date:'2019-10-20'}),

    // ];
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total: number;
    tableLoading: boolean;
    mobilePagination: boolean;

    Waitlist: WaitlistEnrollment[];
    _notification: any;
    orgId: string;
    siteManager: boolean = false;

    constructor(
        private _enrollmentService: WaitListEnrollmentService,
        private  _authService: AuthService,
        private _fuseSidebarService: FuseSidebarService,
    ) {

        this.total = 0;
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        // this.pageSize = this._usersService.defaultPageSize;
        // this.pageIndex = this._usersService.defaultPageIndex;
        // this.pageSizeOptions = this._usersService.defaultPageSizeOptions;
    }

    ngOnInit() {
        this.siteManager = this._authService.getUserLevel() === 'owner';
        if (this.siteManager) {
            this._enrollmentService.getBranchesForBranchManager()
                .pipe()
                .subscribe(data => {
                    this._enrollmentService.changeBranch(data)
                    this.orgId = data[0].orgId;
                })
        }

        // console.log('this._enrollmentService.OrgId')
        // console.log(this.orgId)
    }

    addNew(e, type: string): void {
        e.preventDefault();
        const host = document.location.host;
        const splitUrl = host.split('.');
        const urlParse = (type === AppConst.appStart.ENROLLMENT.NAME) ? AppConst.appStart.ENROLLMENT.BASE_URL : type === AppConst.appStart.ENQUIRY.NAME ? AppConst.appStart.ENQUIRY.BASE_URL : AppConst.appStart.WAITLIST.BASE_URL;

        // if (_.last(splitUrl) === 'au') {
        //     splitUrl.splice(-1, 1);
        // }
        splitUrl.shift();
        const enrolUrl = (this.siteManager) ? `http://enrolment.${splitUrl.join('.')}${urlParse}?${AppConst.queryParamKeys.ENROLMENT.orgId}=${this.orgId}` : location.origin + ((type === AppConst.appStart.ENROLLMENT.NAME) ? AppConst.appStart.ENROLLMENT.BASE_URL : type === AppConst.appStart.ENQUIRY.NAME ? AppConst.appStart.ENQUIRY.BASE_URL : AppConst.appStart.WAITLIST.BASE_URL);
        window.open(enrolUrl, '_blank');
    }

    showFilter() {
        this._fuseSidebarService.getSidebar('table-sidebar').toggleOpen();
    }
}
