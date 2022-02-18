import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject, Observable, of } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ImportCCSEnrolmentService } from '../services/import-enrolments.service';
import { CommonService } from 'app/shared/service/common.service';

import { Child } from 'app/main/modules/child/child.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { User } from 'app/main/modules/user/user.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

export interface EnrolmentListItem {
    child: Child | null;
    parent: User | null;
    sessions: Array<any>
    initialSessions: Array<any>
    hasError: boolean;
    response: any;
}

@Component({
    selector: 'import-ccs-enrollments-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportCCSEnrollmentsListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    enrollments: any;
    children: Child[];
    fees: Fee[];
    parents: User[];
    missingEnrollments: Array<string>;

    enrolmentList: Array<EnrolmentListItem>
    filteredSource: Array<EnrolmentListItem>

    selectedBranch: string;
    selectedOrganization: string;
    selectedEnrolmentIds: Array<string>;

    pageSize: number;
    pageNumber: number;
    listViewLoading: boolean;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _enrolmentImportService: ImportCCSEnrolmentService,
        private _commonService: CommonService
    )
    {
        // set default values
        this.enrollments = [];
        this.children = [];
        this.fees = [];
        this.parents = [];
        this.missingEnrollments = [];

        this.enrolmentList = [];
        this.filteredSource = [];

        this.selectedBranch = null;
        this.selectedOrganization = null;
        this.selectedEnrolmentIds = [];

        this.pageSize = 15;
        this.pageNumber = 1;
        this.listViewLoading = false;

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
        this._logger.debug('import ccs enrollments!!!');

        // Subscribe to enrollments changes
        this._enrolmentImportService
            .onEnrollmentsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: { list: any, children: Child[], fees: Fee[], bookings: Booking[], parents: User[], branch: string, organization: string, csv: any, missing: Array<string> }) =>
            {
                this._logger.debug('[list view - import ccs enrollments]', response);

                this.enrollments = response.list;
                this.children = response.children;
                this.fees = response.fees;
                this.parents = response.parents;
                this.missingEnrollments = response.missing;

                this.selectedBranch = response.branch;
                this.selectedOrganization = response.organization;
                this.selectedEnrolmentIds = response.csv;

                this._commonService._updateParentScroll.next();

                setTimeout(() => this.buildList(), 50);
            });
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

    /**
     * update view scroll on tab collapsed
     *
     * @param {boolean} value
     */
    onTabCollapsed(value: boolean): void
    {
        // update parent scroll
        this._commonService._updateParentScroll.next();
    }

    /**
     * get paginate list
     *
     * @param {*} array
     * @param {number} pageSize
     * @param {number} pageNumber
     * @returns {*}
     */
    paginate(array: any, pageSize: number, pageNumber: number): any
    {
        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    }

    /**
     * on page change
     *
     * @param {number} page
     */
    onPaginateChange(page: number): void
    {
        this.pageNumber = page;

        this.filteredSource = this.paginate(this.enrolmentList, this.pageSize, this.pageNumber);
    }

    /**
     * get enrolment list
     *
     * @returns {Array<EnrolmentListItem>}
     */
    getFilteredSource(): Array<EnrolmentListItem>
    {
        return this.paginate(this.enrolmentList, this.pageSize, this.pageNumber);
    }

    /**
     * get child info
     *
     * @param {string} value
     * @returns {Child}
     */
    getChild(value: string): Child
    {
        return this.children.find(i => i.id === value);
    }

    /**
     * get user info
     *
     * @param {string} value
     * @returns {User}
     */
    getParent(value: string): User
    {
        return this.parents.find(i => i.id === value);
    }

    /**
     * get fee info
     *
     * @param {string} value
     * @returns {Fee}
     */
    getFee(value: string): Fee
    {
        return this.fees.find(i => i.id = value);
    }

    /**
     * get day of week
     *
     * @param {number} value
     * @returns {*}
     */
    getDay(value: number): any
    {
        return this._commonService.getWeekDays().find(i => i['index'] === +value)['name'];
    }

    /**
     * get enrolment status css class
     *
     * @param {string} status
     * @returns {string}
     */
    getStatusClassName(status: string): string
    {
        let className = '';

        if(status === 'CEASED')
        {
            className = 'error';
        }
        else if(status === 'NOTAPP' || status === 'REJECT' || status === 'WITHDR')
        {
            className = 'warning';
        }
        else if(status !== 'PENDIN' && status !== 'NOTAPP' && status !== 'REJECT' && status !== 'WITHDR' && status !== 'CEASED')
        {
            className = 'success';
        }

        return className;
    }

    /**
     * build import list
     */
    buildList(): void
    {
        this.enrolmentList = [];

        for(const enrolment of this.enrollments)
        {
            // map child object with crn
            const _child = this.children.find(i => _.trim(i.CRN) === _.trim(enrolment.response.child_CRN)) || null;

            // map user object with individual crn
            const _parent = this.parents.find(i => _.trim(i.ccsId) === _.trim(enrolment.response.individual_CRN)) || null;

            // map sessions
            const _sessions = this.mapSessions(enrolment.response, enrolment.session, _child);

            // check for errors
            const error = !_child || (enrolment.response.arrangement_type === 'CWA' && !_parent);

            // check if session has errors
            const hasSessionErrors = (_sessions.length > 0 && _sessions.filter((i: { fee: any; }) => !i.fee).length > 0);

            // check child modal
            const _childObj = !_child ? new Child({
                f_name: enrolment.response.child_first_name,
                l_name: enrolment.response.child_last_name,
                dob: enrolment.response.child_date_of_birth,
                crn: enrolment.response.child_CRN
            }) : _child

            if(!_child) _childObj.isNew = true;

            // check parent modal
            const _parentObj = !_parent ? new User({
                first_name: enrolment.response.individual_first_name,
                last_name: enrolment.response.individual_last_name,
                dob: enrolment.response.individual_date_of_birth,
                ccs_id: enrolment.response.individual_CRN
            }) : _parent

            if(!_parent) _parentObj.isNew = true;

            // add to list
            this.enrolmentList.push({
                child: _childObj,
                parent: _parentObj,
                sessions: !hasSessionErrors ? _sessions : [],
                initialSessions: hasSessionErrors ? _sessions : [],
                response: enrolment.response,
                hasError: error
            });
        }
    }

    /**
     * format session items
     *
     * @param {*} enrolment
     * @param {*} sessions
     * @param {Child} child
     * @returns {*}
     */
    mapSessions(enrolment: any, sessions: any, child: Child): any
    {
        const list = [];

        for (const item of sessions)
        {
            let feeMap: Fee[] = [];

            if(item['sessionType'] === 'CASUAL')
            {
                feeMap = this.fees.filter(i =>
                {
                    return i.isCasual() && parseFloat(i.netAmount.toString()) === parseFloat(item['standardAmount']);
                });
            }
            else
            {
                // get session week from enrolment start date
                const dateObj = this.getSessionDateMap(enrolment['arrangement_start_date'], item['cycleWeekNumber']).find((i: any) => i['index'] === +item['sessionDay']) || null;

                if (dateObj)
                {
                    feeMap = this.fees.filter(i =>
                    {
                        return !i.isCasual() 
                            && parseFloat(i.netAmount.toString()) === parseFloat(item['standardAmount'])
                            && DateTimeHelper.convertMinTo24HourString(i.sessionStart) === item['startTime']
                            && DateTimeHelper.convertMinTo24HourString(i.sessionEnd) === item['endTime'];
                    });
                }

                item['date'] = dateObj ? dateObj.date : null;
                item['session'] = {
                    start: _.isEmpty(feeMap) ? null : _.head(feeMap).sessionStart,
                    end: _.isEmpty(feeMap) ? null : _.head(feeMap).sessionEnd
                };
            }

            item['fee'] = _.isEmpty(feeMap) ? null : _.head(feeMap).id;
            item['addedManually'] = false;
            item['available_bookings'] = _.isEmpty(feeMap) ? feeMap : null;

            list.push(item);
        }

        return list;
    }

    /**
     * get session dates
     *
     * @param {string} arrangementStartDate
     * @param {string} cycleWeek
     * @returns {Array<{ index: number, name: string, date: string }>}
     */
    getSessionDateMap(arrangementStartDate: string, cycleWeek: string): Array<{ index: number, name: string, date: string }>
    {
        const list = [];

        const startDate = DateTimeHelper.parseMoment(arrangementStartDate);
        const endDate = startDate.clone().add((cycleWeek === '1') ? 6 : 13, 'd');

        const dateRange = DateTimeHelper.getDateRange(startDate, endDate);

        for(const date of dateRange)
        {
            list.push({
                index: date.day(),
                name: _.toLower(date.format('dddd')),
                date: date.format(AppConst.dateTimeFormats.dateOnly)
            });
        }

        return list;
    }

    /**
     * reload list
     *
     * @returns {Promise<any>}
     */
    refetch(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            const sendObj = {
                org: this.selectedOrganization,
                branch: this.selectedBranch,
                enrollments: this.selectedEnrolmentIds,
            };

            this._logger.debug('[import enrolment object - reload]', sendObj);

            this.listViewLoading = true;

            this._enrolmentImportService
                .getEnrollments(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this.listViewLoading = false, 200))
                )
                .subscribe(
                    response =>
                    {
                        this._logger.debug('[list view - import ccs enrollments - reload]', response);

                        this._enrolmentImportService.onEnrollmentsChanged.next({
                            list: response.enrollments,
                            children: response.children,
                            fees: response.fees,
                            parents: response.parents,
                            branch: this.selectedBranch,
                            organization: this.selectedOrganization,
                            csv: this.selectedEnrolmentIds,
                            missing: response.missing
                        });

                        resolve(null);
                    },
                    errorRes => reject(errorRes)
                );
        });
    }

    /**
     * get values for migration
     *
     * @returns {*}
     */
    getMigrationValues(): any
    {
        const obj = {
            org: this.selectedOrganization,
            branch: this.selectedBranch,
            list: []
        };

        for(const item of this.enrolmentList)
        {
            const sItem = [...item.sessions];
            const isItem = [...item.initialSessions];

            const insert = {
                enrol_id: item.response.enrolment_id,
                status: item.response.status,
                enrollment_start: item.response.arrangement_start_date,
                enrollment_end: item.response.enrollment_end_date === '0000-00-00' ? null : item.response.enrollment_end_date,
                individual: item.parent.id,
                child: item.child.id,
                late_submission: item.response.late_submission_reason,
                arrangement_type: item.response.arrangement_type,
                arrangement_type_note: item.response.arrangement_type === 'OA' ? item.response.signing_party_organisation_name : null,
                session_type: item.response.session_indicator || 'B',
                session_is_case: item.response.is_child_in_state_care,
                signing_party: !_.isEmpty(item.response.individual_CRN) ? '0' : '1',
                signing_party_first_name: !_.isEmpty(item.response.individual_CRN) ? null: item.response.signing_party_individual_first_name,
                signing_party_last_name: !_.isEmpty(item.response.individual_CRN) ? null: item.response.signing_party_individual_last_name,
                is_case_details: null,
                notes: null,
                weeks_cycle: item.response.number_of_weeks_cycle,
                initial_sessions: isItem.length > 0 ? isItem.map(i =>
                    {
                        delete i.session;
                        delete i.fee;
                        delete i.addedManually;
                        delete i.available_bookings;

                        return i;
                    }) : [],
                sessions: sItem.length > 0 ? sItem.map(i =>
                    {
                        delete i.session_type_label;
                        delete i.session_measure_label;
                        delete i.session_indicator_label;
                        delete i.available_bookings;

                        return i;
                    }) : []
            }

            obj.list.push(insert);
        }

        return obj;
    }
}
