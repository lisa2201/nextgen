import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, Subject, BehaviorSubject, forkJoin} from 'rxjs';
import {AppConst} from 'app/shared/AppConst';
import {map, shareReplay, takeUntil, finalize, take} from 'rxjs/operators';
import * as _ from 'lodash';
import {ActivatedRouteSnapshot, RouterStateSnapshot, Resolve} from '@angular/router';
import {AuthService} from 'app/shared/service/auth.service';
import {NGXLogger} from 'ngx-logger';
import {WaitlistEnrollment} from '../waitlist-enrollment-list/waitlist-enrollment.model';
import {Branch} from '../../branch/branch.model';
import {PDFHelperService} from 'app/shared/service/pdf-helper.service';
import {Country} from 'app/shared/model/common.interface';
import {DateTimeHelper} from '../../../../utils/date-time.helper';
import {FormFieldsSettings} from '../models/form-fields-settings';
import {Room} from '../../room/models/room.model';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {CsvService} from 'app/shared/service/csv.service';
import {NotificationService} from 'app/shared/service/notification.service';


@Injectable({
    providedIn: 'root'
})
export class WaitListEnrollmentService implements Resolve<any> {

    onSearchTextChanged: Subject<any>;
    onUsersChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    onWaitlistChanged: BehaviorSubject<any>;
    onWaitlistPrintDataChanged: BehaviorSubject<any>;
    onSettingsChanged: BehaviorSubject<any>;
    onAllergyChanged: BehaviorSubject<any>;

    _unsubscribeAll: Subject<any>;

    currentType: any;
    searchText: any;
    pagination: any | null = null;
    defaultPageIndex: any;
    defaultPageSize: any;
    defaultPageSizeOptions: number[];
    filterBy: any | null = null;

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: any;

    branchDetails: any;
    waitlistModel: WaitlistEnrollment [];

    branches = new BehaviorSubject([]);
    changeBranches = this.branches.asObservable();
    emergencyContactsSettings = new BehaviorSubject([]);


    constructor(
        private _httpClient: HttpClient,
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _auth: AuthService,
        private _pdfHelperService: PDFHelperService,
        private _csvService: CsvService,
        private _notification: NotificationService,
    ) {

        this.onTableLoaderChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this._unsubscribeAll = new Subject();
        this.onPaginationChanged = new Subject();
        this.onFilterChanged = new Subject();

        this.onWaitlistChanged = new BehaviorSubject([]);
        this.onWaitlistPrintDataChanged = new BehaviorSubject([]);
        this.onUsersChanged = new BehaviorSubject([]);
        this.onSettingsChanged = new BehaviorSubject([]);
        this.onAllergyChanged = new BehaviorSubject([]);

        this.currentType = 5;
        this.searchText = null;
        this.defaultPageIndex = 1;
        this.defaultPageSize = 5;
        this.defaultPageSizeOptions = [5, 10, 20];

        this.branchDetails = this._auth.getClient();
    }

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {Observable<any> | Promise<any> | any}
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {
            Promise.all([
                this.getwaitlist(),
                this.getAllergyTypes()
            ])
                .then(([list, allergies]) => {

                    this.setEvents();

                    resolve(null);
                })
                .catch(error => {
                    reject(error);
                });

        });
    }

    setEvents() {

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {

                if (pagination === 1000) {
                    this.getwaitlistForPrint()
                } else {
                    this.pagination = pagination
                    this.getwaitlist();
                }
            });

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }
                this.getwaitlist();

            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                if (filter !== null && Object.keys(filter)[0] == 'status') {
                    const newfind = {
                        priority: this.filterBy?.priority != undefined ? this.filterBy.priority : null,
                        status: filter['status'],
                        application_date: this.filterBy?.application_date != undefined ? this.filterBy.application_date : null,
                        expected_start_date: this.filterBy?.expected_start_date != undefined ? this.filterBy.expected_start_date : null,
                        age: this.filterBy?.age != undefined ? this.filterBy.age : null,
                        gender: this.filterBy?.gender != undefined ? this.filterBy.gender : null,
                        days_waiting: this.filterBy?.days_waiting != undefined ? this.filterBy.days_waiting : null,
                        sibilings: this.filterBy?.sibilings != undefined ? this.filterBy.sibilings : null,
                        branch: this.filterBy?.branch == undefined ? filter['branch'] != undefined ? filter['branch'] : null : this.filterBy.branch,
                    }
                    this.filterBy = newfind;
                } else if (filter !== null && Object.keys(filter)[0] == 'priority') {
                    const newfind = {
                        priority: filter['priority'],
                        status: this.filterBy?.status != undefined ? this.filterBy.status : null,
                        application_date: filter['application_date'],
                        expected_start_date: filter['expected_start_date'],
                        age: filter['age'],
                        gender: filter['gender'],
                        days_waiting: filter['days_waiting'],
                        sibilings: filter['sibilings'],
                        branch: filter['branch'],
                    }
                    this.filterBy = newfind;
                } else {
                    this.filterBy = filter;
                }

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.getwaitlist();
            });
    }

    getwaitlist(): Promise<any> {

        return new Promise((resolve, reject) => {
            // set table loader
            this.onTableLoaderChanged.next(true);

            if (_.isNull(this.pagination)) {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('page', this.pagination.page)
                .set('offset', this.pagination.size)
                .set('search', this.searchText)
                .set('filters', JSON.stringify(this.filterBy));

            if (!_.isNull(this.filterBy)) {
                this.currentType = this.filterBy.status;
            }

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-waitlist`, {params})
                .pipe(
                    map((response) => {
                        this.waitlistModel = response.data.map((i: any, idx: number) => new WaitlistEnrollment(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.waitlistModel],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            enquiredCount: response.enquiredCount,
                            waitlistCount: response.waitllistCount,
                            emailedCount: response.emailedCount,
                            enroledtCount: response.enroledtCount,
                            activetCount: response.activetCount
                        };

                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onWaitlistChanged.next(response);

                        resolve(null);
                    },
                    reject
                );
        });
    }

    sendMail(index: string): Observable<any> {

        const params = new HttpParams().set('id', index);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/send-enrollment-form`, {params})
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response;

                }), shareReplay()
            );
    }

    sendWaitlist(index: string): Observable<any> {

        const params = new HttpParams().set('id', index);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/send-waitlist-form`, {params})
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response;

                }), shareReplay()
            );
    }

    createChild(data: any): Observable<any> {

        const params = new HttpParams().set('id', data['id']).set('room', data['room_id']).set('send_ezidebit_mail', data['send_ezidebit_mail']);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/activate-child`, {params})
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response;

                }), shareReplay()
            );
    }

    deleteWaitlisedItem(type: any, index: string): Observable<any> {

        const params = new HttpParams().set('type', type)
            .set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-item`, {params})
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response.message;

                }), shareReplay()
            );

    }

    getEnrollLink(index: string): Observable<any> {

        const params = new HttpParams().set('id', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enroll-link`, {params})
            .pipe(
                map((response) => {

                    return response;

                }), shareReplay()
            );

    }

    updateWailistEnrolment(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-waitlist-enrolment-update`, postData)
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response.message;

                }), shareReplay()
            );

    }

    enrollChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/enroll-child`, postData)
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response.message;

                }), shareReplay()
            );

    }

    updateWaitListChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-wait-list-update`, postData)
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response.message;

                }), shareReplay()
            );

    }

    updateEnquiryChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-enquiry-update`, postData)
            .pipe(
                map((response) => {
                    this.getwaitlist();
                    return response.message;

                }), shareReplay()
            );

    }

    /**
     * get Allergy Typew
     *
     * @returns {Observable<any>}
     */
    getAllergyTypes(): Promise<any> {
        return new Promise((resolve, reject) => {

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-allergy-types`)
                .pipe(
                    map((response) => {
                        if (response.data && _.keys(response.data).length < 1) {
                            return {};
                        } else {
                            return {
                                allergyTypes: response.data
                            };
                        }

                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onAllergyChanged.next(response);

                        resolve(null);
                    },
                    reject
                );
        });

    }


    getBranchesForBranchManager(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/get-enrolment-form-branches-for-org`)
            .pipe(
                map((response) => {
                    return _.map(response.data, (val: any, idx: number) => new Branch(val, idx));
                }),
                shareReplay()
            );

    }

    getDirectProcessesForSettings(form: string, waitlistId: string): Observable<any> {

        const params = new HttpParams()
            .set('form', form)
            .set('waitlist_id', waitlistId);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-settings-waitlist`, {params})
            .pipe(
                map((response) => {
                    return _.map(response.data, (val: any, idx: number) => new FormFieldsSettings(val, idx));
                }),
                shareReplay()
            );
    }

    changeBranch(branch): void {
        this.branches.next(branch);
    }

    getAdditionalAnswer(obj: any): any {

        if (obj.values) {

            if (_.isArray(obj.values)) {
                return _.join(obj.values, ',');
            } else if (_.isBoolean(obj.values)) {
                return obj.values === true ? 'Yes' : 'No';
            } else {
                return obj.values;
            }

        } else {
            return 'N/A';
        }

    }

    designPrintCRM(data: any, countries: Country[], bookingDisplay: any, action: string): void {
        const pageTitle = (data.status === '2' || data.status === '3') ? 'Enrolment Form' : (data.status === '0' || data.status === '1') ? 'Waitlist Form' : 'Enquiry Form';
        const pageType = 'A4';
        const isLandscape = false;

        const waitlistInfo = data.waitlist_info;
        const allInputs = data.all_inputs;
        const sections = (data.status === '2' || data.status === '3') ? (data.enrolment_sections || []) : (data.status === '0' || data.status === '1') ? (data.waitlist_sections || []) : (data.enquiry_sections || []);

        const content = [];
        let intermediateArr = null;

        content.push(
            {text: pageTitle, style: 'header'},
            {
                canvas: [{
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40,
                    y2: 0,
                    lineWidth: 1
                }]
            },
        );

        for (const section of sections) {
            content.push({text: section['name'], style: 'subheader'});
            intermediateArr = {
                columns: [],
                columnGap: 10
            };
            let columns3 = 0;
            for (const inputName of section['inputs']) {

                if (section['code'] === 'emergency_contact_details') {
                    if (inputName !== 'addEmergencyContact') {
                        continue
                    }
                }
                const input = allInputs[allInputs.findIndex((val) => val.name === inputName)];
                const questionOnly = input.input_type === 'richTextBox' || input.input_type === 'hyperlink'

                if (inputName === 'parentCountry' || inputName === 'additionalCarerCountry') {
                    input.values = (input.values !== '' && input.values !== null) ? !_.isEmpty(countries.find(e => e.code === input.values)) ? countries.find(e => e.code === input.values)['name'] : input.values : '';
                }

                if ((input.height === '33' || input.height === '50' || input.height === '66' || input.height === '70') && !(inputName === 'addEmergencyContact' || inputName === 'attendance' || inputName === 'preferedDate' || inputName === 'addAllergy')) {

                    const thisFieldSize = input.height === '33' ? 1 : input.height === '66' || input.height === '70' ? 2 : input.height === '50' ? 1.5 : 0
                    columns3 += thisFieldSize;
                    if (columns3 > 3) {
                        content.push(intermediateArr);
                        intermediateArr = {
                            columns: [],
                            columnGap: 10
                        };
                        columns3 = thisFieldSize;
                    }

                    intermediateArr.columns.push(
                        {
                            stack: [
                                {
                                    text: input.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                    style: (!questionOnly ? 'question' : 'answer'),
                                },
                                {
                                    text: (!questionOnly ? this.valuesConverter(input.input_type, input.values) : ''),
                                    style: 'answer'
                                }
                            ],
                            width: input.height === '70' ? '66%' : input.height + '%',
                        }
                    );


                } else if ((input.height === '80' || input.height === '100') && !(inputName === 'addEmergencyContact' || inputName === 'attendance' || inputName === 'preferedDate' || inputName === 'addAllergy')) {
                    if ((intermediateArr.columns).length > 0) {
                        content.push(intermediateArr);
                    }

                    if (input.input_type === 'signature' && (!questionOnly ? this.valuesConverter(input.input_type, input.values) : '') !== '' && this.valuesConverter(input.input_type, input.values) !== 'N/A') {
                        content.push(
                            {
                                text: [
                                    {
                                        text: input.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                        style: (!questionOnly ? 'question' : 'answer'),
                                    }
                                ],
                                style: 'newLine'
                            },
                            {
                                image: this.valuesConverter(input.input_type, input.values),
                                width: '300',
                            }
                        );
                    } else {
                        content.push(
                            {
                                text: [
                                    {
                                        text: input.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                        style: (!questionOnly ? 'question' : 'answer'),
                                    },
                                    {
                                        text: (!questionOnly ? this.valuesConverter(input.input_type, input.values) : ''),
                                        style: 'answer'
                                    }
                                ],
                                style: 'newLine'
                            }
                        );
                    }

                    intermediateArr = {
                        columns: [],
                        columnGap: 10
                    };
                    columns3 = 0;
                } else if ((inputName === 'attendance' || inputName === 'preferedDate') && !(inputName === 'addEmergencyContact' || inputName === 'addAllergy')) { /*tables */
                    if ((intermediateArr.columns).length > 0) {
                        content.push(intermediateArr);
                    }

                    content.push(
                        {
                            text: [
                                {
                                    text: input.question.replace(/<\/?[^>]+(>|$)/g, '') + ' : ',
                                    style: 'question'
                                }
                            ],
                            style: 'newLine'
                        }
                    );
                    content.push({
                        table: {
                            headerRows: 1,
                            keepWithHeaderRows: true,
                            dontBreakRows: true,
                            widths: _.fill([1, 2, 3, 4, 5, 6], 'auto'),
                            body: this.preferedDate(bookingDisplay)
                        },
                        style: 'table'
                    });
                    intermediateArr = {
                        columns: [],
                        columnGap: 10
                    };

                } else if (inputName === 'addEmergencyContact' && !(inputName === 'addAllergy')) {
                    let key = 1;

                    for (const emeRow of input['values']) {
                        content.push({
                            text: 'Emergency details ' + key++,
                            style: 'subSectionHeader'
                        });
                        intermediateArr = {
                            columns: [],
                            columnGap: 10
                        };
                        let columnsEm3 = 0;

                        for (const emeInputName of section['inputs']) {
                            if (emeInputName !== 'addEmergencyContact') {

                                const emInput = allInputs[allInputs.findIndex((val) => val.name === emeInputName)];
                                const emQuestionOnly = emInput.input_type === 'richTextBox' || emInput.input_type === 'hyperlink'

                                if ((emInput.height === '33' || emInput.height === '50' || emInput.height === '66' || emInput.height === '70')) {

                                    const thisFieldSize = emInput.height === '33' ? 1 : emInput.height === '66' || emInput.height === '70' ? 2 : emInput.height === '50' ? 1.5 : 0
                                    columnsEm3 += thisFieldSize;
                                    if (columnsEm3 > 3) {
                                        content.push(intermediateArr);
                                        intermediateArr = {
                                            columns: [],
                                            columnGap: 10
                                        };
                                        columnsEm3 = thisFieldSize;
                                    }

                                    intermediateArr.columns.push(
                                        {
                                            stack: [
                                                {
                                                    text: emInput.question.replace(/<\/?[^>]+(>|$)/g, '') + (!emQuestionOnly ? ' : ' : ''),
                                                    style: (!emQuestionOnly ? 'question' : 'answer'),
                                                },
                                                {
                                                    text: (!emQuestionOnly ? this.valuesConverter(emInput.input_type, emeRow[emeInputName]) : ''),
                                                    style: 'answer'
                                                }
                                            ],
                                            width: emInput.height === '70' ? '66%' : emInput.height + '%',
                                        }
                                    );


                                } else {
                                    /* add missed fields that 3 fields in above*/
                                    if ((intermediateArr.columns).length > 0) {
                                        content.push(intermediateArr);
                                    }

                                    if (emInput.input_type === 'signature' && (!emQuestionOnly ? this.valuesConverter(emInput.input_type, emeRow[emeInputName]) : '') !== '' && this.valuesConverter(emInput.input_type, emeRow[emeInputName]) !== 'N/A') {
                                        content.push(
                                            {
                                                text: [
                                                    {
                                                        text: emInput.question.replace(/<\/?[^>]+(>|$)/g, '') + (!emQuestionOnly ? ' : ' : ''),
                                                        style: (!emQuestionOnly ? 'question' : 'answer'),
                                                    }
                                                ],
                                                style: 'newLine'
                                            },
                                            {
                                                image: this.valuesConverter(emInput.input_type, emeRow[emeInputName]),
                                                width: '300',
                                            }
                                        );
                                    } else {
                                        content.push(
                                            {
                                                text: [
                                                    {
                                                        text: emInput.question.replace(/<\/?[^>]+(>|$)/g, '') + (!emQuestionOnly ? ' : ' : ''),
                                                        style: (!emQuestionOnly ? 'question' : 'answer'),
                                                    },
                                                    {
                                                        text: (!emQuestionOnly ? this.valuesConverter(emInput.input_type, emeRow[emeInputName]) : ''),
                                                        style: 'answer'
                                                    }
                                                ],
                                                style: 'newLine'
                                            }
                                        );
                                    }


                                    intermediateArr = {
                                        columns: [],
                                        columnGap: 10
                                    };
                                }
                            }

                        }
                        if ((intermediateArr.columns).length > 0) {
                            content.push(intermediateArr);
                        }
                    }

                } else if (inputName === 'addAllergy') {
                    if ((intermediateArr.columns).length > 0) {
                        content.push(intermediateArr);
                    }
                    content.push({text: 'Allergy/Dietary Requirements Details', style: 'subSectionHeader'});
                    for (const allergy of waitlistInfo.allergiesArray) {
                        content.push(
                            {
                                text: [
                                    {text: `${allergy.name} : `, style: 'answer'},
                                    {text: allergy.detailsOfAllergies, style: 'answer'}
                                ],
                                style: 'newLine'
                            }
                        );
                    }
                    intermediateArr = {
                        columns: [],
                        columnGap: 10
                    };
                }
            }
            if ((intermediateArr.columns).length > 0) {
                content.push(intermediateArr);
            }
        }
        console.log('last')
        console.log(content)
        const styles = {
            header: {
                fontSize: 21,
                margin: [0, 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0, 8, 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                margin: [0, 15, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 16,
                bold: false,
                margin: [0, 12, 0, 10]
            },
            subSectionHeader: {
                fontSize: 14,
                bold: false,
                margin: [0, 12, 0, 10]
            },
            question: {
                bold: true,
                fontSize: 10,
                margin: [0, 8, 0, 0]
            },
            answer: {
                bold: false,
                fontSize: 10
            },
            newLine: {
                margin: [0, 10, 0, 0]
            },
            row: {
                margin: [0, 10, 0, 0]
            }
        };

        this._pdfHelperService
            .generatePDF(action, isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch((error: any) => {
                throw error;
            });

    }

    preferedDate(bookingDisplay): any {
        const tableData = [];

        const headers = _.map(['MON', 'TUE', 'WED', 'THU', 'FRI', 'ALL Days'], (val) => {
            return {
                text: val
            };
        });

        tableData.push(headers);

        tableData.push([
            (bookingDisplay.monday) ? bookingDisplay.monday : 'N/A',
            (bookingDisplay.tuesday) ? bookingDisplay.tuesday : 'N/A',
            (bookingDisplay.wednesday) ? bookingDisplay.wednesday : 'N/A',
            (bookingDisplay.thursday) ? bookingDisplay.thursday : 'N/A',
            (bookingDisplay.friday) ? bookingDisplay.friday : 'N/A',
            (bookingDisplay.allDays) ? bookingDisplay.allDays : 'N/A',

        ]);

        return tableData
    }

    valuesConverter(type: string, value: any): string {
        let text = '';
        if (typeof (value) === 'boolean' || type === 'checkbox') {
            if (type === 'checkbox' && value !== undefined && _.isArray(value)) {
                text = (value.length > 0) ? (value).toString() : 'No'
            } else {
                text = value ? 'Yes' : 'No'
            }
        } else if (value === null || value === '' || value === 0) {
            text = (type === 'switch') ? 'No' : 'N/A';

            if (type === 'upload-switch') {
                text = value ? 'Yes' : 'No';
            }

        } else {
            if (type === 'date-picker') {
                text = value !== '' ? DateTimeHelper.getUtcDate(value) : 'N/A';
            } else if (type === 'select' || type === 'select-multiple') {
                text = value == null || (value).toString() === '' ? 'N/A' : value;
            } else if (type === 'radio-group') {
                text = value == 1 ? 'Female' : 'Male'
            } else if (type === 'upload-switch') {
                text = value ? 'Yes' : 'No';
            } else {
                text = value
            }
        }
        return text;
    }

    printEnrolment(data: any, countries: Country[], bookingDisplay: any): void {

        const pageTitle = 'Enrolment Form';
        const pageType = 'A4';
        const isLandscape = false;

        const waitlistInfo = data.waitlist_info;
        const elementSettings = data.element_settings;
        const countryName = countries.find(e => e.code === waitlistInfo.parent_country);

        let content = [];
        let intermediateArr = null;

        content.push(
            {text: pageTitle, style: 'header'},
            {
                canvas: [{
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40,
                    y2: 0,
                    lineWidth: 1
                }]
            },
            {text: 'Child Information', style: 'subheader'}
        );

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.child_firstname?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'First Name:', style: 'question'},
                        {text: waitlistInfo.child_firstname ? waitlistInfo.child_firstname : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.child_middlename?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Middle Name:', style: 'question'},
                        {text: (waitlistInfo.child_middlename) ? waitlistInfo.child_middlename : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.child_lastname?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Last Name:', style: 'question'},
                        {text: (waitlistInfo.child_lastname) ? waitlistInfo.child_lastname : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.child_date_of_birth?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'DOB:', style: 'question'},
                        {
                            text: (waitlistInfo.child_date_of_birth) ? waitlistInfo.child_date_of_birth : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.chil_crn?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Child CRN:', style: 'question'},
                        {text: (waitlistInfo.chil_crn) ? waitlistInfo.chil_crn : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.child_gender?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Gender:', style: 'question'},
                        {text: (waitlistInfo.child_gender == '1') ? 'Female' : 'Male', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.child_address?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Address:', style: 'question'},
                        {text: (waitlistInfo.child_address) ? waitlistInfo.child_address : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.child_state?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'State:', style: 'question'},
                        {text: (waitlistInfo.child_state) ? waitlistInfo.child_state : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.child_suburb?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Suburb:', style: 'question'},
                        {text: (waitlistInfo.child_suburb) ? waitlistInfo.child_suburb : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.child_postcode?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Postcode:', style: 'question'},
                        {text: (waitlistInfo.child_postcode) ? waitlistInfo.child_postcode : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.sibilings?.hidden == 1) {

            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Enrolment Start Date:', style: 'question'},
                        {
                            text: (waitlistInfo.enrollment_start_date) ? waitlistInfo.enrollment_start_date : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '33%',
                }
            );
        }

        intermediateArr.columns.push(
            {
                stack: [
                    {text: 'Sibilings:', style: 'question'},
                    {text: (waitlistInfo.sibilings == '1') ? 'Yes' : 'No', style: 'answer'}
                ],
                width: '33%',
            }
        );

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.nappyChange?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Nappy Change Required:', style: 'question'},
                        {text: (waitlistInfo.nappyChange) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.bottleFeed?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Bottle Feed Required:', style: 'question'},
                        {text: (waitlistInfo.bottleFeed) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        content.push(
            {
                text: [
                    {text: 'Are there any court appointed orders relating to this enrolment?', style: 'question'},
                    {
                        text: (waitlistInfo.courtorders_chk || waitlistInfo.upload_files?.courtAppointed != undefined) ? 'Yes' : 'No',
                        style: 'answer'
                    }
                ],
                style: 'newLine'
            }
        );

        if (elementSettings.child_circumstances?.hidden == 1) {
            content.push(
                {
                    text: [
                        {text: 'Child’s Special Circumstances?', style: 'question'},
                        {
                            text: (waitlistInfo.child_circumstances) ? waitlistInfo.child_circumstances : 'N/A',
                            style: 'answer'
                        }
                    ],
                    style: 'newLine'
                }
            );
        }

        const basicAdditional = _.filter(waitlistInfo.new_inputs, {section: 'child_information'});

        if (basicAdditional.length > 0) {

            for (let basicrec of basicAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${basicrec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(basicrec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        content.push({text: 'Cultural Background', style: 'subheader'});

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.child_aboriginal?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Are you of Aboriginal or Torres Strait Islander descent?', style: 'question'},
                        {text: (waitlistInfo.child_aboriginal) ? waitlistInfo.child_aboriginal : 'N/A', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.cultural_background?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `What is your child's cultural background?`, style: 'question'},
                        {
                            text: (waitlistInfo.cultural_background) ? waitlistInfo.cultural_background : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.spoken_language?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `What language is spoken at home?`, style: 'question'},
                        {text: (waitlistInfo.spoken_language) ? waitlistInfo.spoken_language : 'N/A', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.cultural_requirement?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have any cultural requirements?`, style: 'question'},
                        {
                            text: (waitlistInfo.cultural_requirement_chk) ? waitlistInfo.cultural_requirement : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.religious_requirements?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have any religious requirements?`, style: 'question'},
                        {
                            text: (waitlistInfo.religious_requirements_chk) ? waitlistInfo.religious_requirements : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        const cultureAdditional = _.filter(waitlistInfo.new_inputs, {section: 'cultural_background'});

        if (cultureAdditional.length > 0) {

            for (let rec of cultureAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${rec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(rec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        content.push({text: 'Booking Details', style: 'subheader'});

        if (elementSettings.enrollment_start_date?.hidden == 1) {
            content.push(
                {
                    text: [
                        {text: 'Expected Start Date:', style: 'question'},
                        {
                            text: (waitlistInfo.enrollment_start_date) ? waitlistInfo.enrollment_start_date : 'N/A',
                            style: 'answer'
                        }
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.bookings?.hidden == 1) {

            let tableData = [];

            const headers = _.map(['MON', 'TUE', 'WED', 'THU', 'FRI', 'ALL Days'], (val) => {
                return {
                    text: val
                };
            });

            tableData.push(headers);

            tableData.push([
                (bookingDisplay.monday) ? bookingDisplay.monday : 'N/A',
                (bookingDisplay.tuesday) ? bookingDisplay.tuesday : 'N/A',
                (bookingDisplay.wednesday) ? bookingDisplay.wednesday : 'N/A',
                (bookingDisplay.thursday) ? bookingDisplay.thursday : 'N/A',
                (bookingDisplay.friday) ? bookingDisplay.friday : 'N/A',
                (bookingDisplay.allDays) ? bookingDisplay.allDays : 'N/A',

            ]);

            content.push({
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill([1, 2, 3, 4, 5, 6], 'auto'),
                    body: tableData
                },
                style: 'table'
            });


        }

        const bookingAdditional = _.filter(waitlistInfo.new_inputs, {section: 'booking_details'});

        if (bookingAdditional.length > 0) {

            for (let basicrec of bookingAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${basicrec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(basicrec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        content.push({text: 'Health Information', style: 'subheader'});

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.child_medical_number?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Child's Medicare Number/Reference No:`, style: 'question'},
                        {
                            text: (waitlistInfo.child_medical_number) ? waitlistInfo.child_medical_number : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.child_medicalexpiry_date?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Child's Medicare Expiry Date:`, style: 'question'},
                        {
                            text: (waitlistInfo.child_medicalexpiry_date) ? waitlistInfo.child_medicalexpiry_date : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.ambulance_cover_no?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Ambulance Cover Number:`, style: 'question'},
                        {
                            text: (waitlistInfo.ambulance_cover_no) ? waitlistInfo.ambulance_cover_no : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.child_heallth_center?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Maternal & Child Health Centre:`, style: 'question'},
                        {
                            text: (waitlistInfo.child_heallth_center) ? waitlistInfo.child_heallth_center : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.practitioner_name?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Medical Personnel/Service Name:`, style: 'question'},
                        {
                            text: (waitlistInfo.practitioner_name) ? waitlistInfo.practitioner_name : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.practitioner_phoneNo?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Medical Personnel/Service Phone Number:`, style: 'question'},
                        {
                            text: (waitlistInfo.practitioner_phoneNo) ? waitlistInfo.practitioner_phoneNo : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.practitioner_address?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Medical Personnel/Service Address:`, style: 'question'},
                        {
                            text: (waitlistInfo.practitioner_address) ? waitlistInfo.practitioner_address : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.health_record_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have a Health Record?`, style: 'question'},
                        {text: (waitlistInfo.health_record_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.immunised_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Has your child been immunised?`, style: 'question'},
                        {text: (waitlistInfo.immunised_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.prescribed_medicine_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Is your child receiving regular prescribed medicine?`, style: 'question'},
                        {text: (waitlistInfo.prescribed_medicine_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        content.push({text: 'Allergy/Dietary Requirements Details', style: 'subheader'});

        if (waitlistInfo.allergiesArray && waitlistInfo.allergiesArray.length > 0) {

            for (let allergy of waitlistInfo.allergiesArray) {

                content.push(
                    {
                        text: [
                            {text: `${allergy.name}:`, style: 'answer'},
                            {text: allergy.detailsOfAllergies, style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.anaphylaxis_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Has your child be diagnosed or at risk of anaphylaxis?`, style: 'question'},
                        {text: (waitlistInfo.anaphylaxis_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.epipen_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have an epipen or anipen?`, style: 'question'},
                        {text: (waitlistInfo.epipen_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.other_health_conditions_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have any other health conditions?`, style: 'question'},
                        {text: (waitlistInfo.other_health_conditions_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.asthma_chk?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have asthma?`, style: 'question'},
                        {text: (waitlistInfo.asthma_chk) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.birth_certificate?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Does your child have a birth certificate?`, style: 'question'},
                        {text: (waitlistInfo.birth_certificate) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        const healthAdditional = _.filter(waitlistInfo.new_inputs, {section: 'health_information'});

        if (healthAdditional.length > 0) {

            for (let rec of healthAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${rec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(rec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        content.push(intermediateArr);

        content.push({text: 'Parent 1/Primary Carer', style: 'subheader'});

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_firstname?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'First Name:', style: 'question'},
                        {text: (waitlistInfo.parent_firstname) ? waitlistInfo.parent_firstname : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.parent_middlename?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Middle Name:', style: 'question'},
                        {
                            text: (waitlistInfo.parent_middlename) ? waitlistInfo.parent_middlename : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.parent_lastname?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Last Name:', style: 'question'},
                        {text: (waitlistInfo.parent_lastname) ? waitlistInfo.parent_lastname : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_dob?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'DOB:', style: 'question'},
                        {text: (waitlistInfo.parent_dob) ? waitlistInfo.parent_dob : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.email?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Email:', style: 'question'},
                        {text: (waitlistInfo.email) ? waitlistInfo.email : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.relationship?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Relationship:', style: 'question'},
                        {text: (waitlistInfo.relationship) ? waitlistInfo.relationship : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_address?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Address:', style: 'question'},
                        {text: (waitlistInfo.parent_address) ? waitlistInfo.parent_address : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.parent_suburb?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Suburb:', style: 'question'},
                        {text: (waitlistInfo.parent_suburb) ? waitlistInfo.parent_suburb : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.parent_country?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Country:', style: 'question'},
                        {text: (countryName) ? countryName.name : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_postalCode?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Postal Code:', style: 'question'},
                        {
                            text: (waitlistInfo.parent_postalCode) ? waitlistInfo.parent_postalCode : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.parent_state?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'State:', style: 'question'},
                        {text: (waitlistInfo.parent_state) ? waitlistInfo.parent_state : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.parent_phone?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Phone:', style: 'question'},
                        {text: (waitlistInfo.parent_phone) ? waitlistInfo.parent_phone : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_mobile?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Mobile:', style: 'question'},
                        {text: (waitlistInfo.parent_mobile) ? waitlistInfo.parent_mobile : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.occupation?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Occupation:', style: 'question'},
                        {text: (waitlistInfo.occupation) ? waitlistInfo.occupation : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.work_address?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Work Address:', style: 'question'},
                        {text: (waitlistInfo.work_address) ? waitlistInfo.work_address : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.work_email?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Work Email:', style: 'question'},
                        {text: (waitlistInfo.work_email) ? waitlistInfo.work_email : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.work_phone?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Work Phone Number:', style: 'question'},
                        {text: (waitlistInfo.work_phone) ? waitlistInfo.work_phone : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.consent_emergency_contact?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'I consent to be an emergency contact:', style: 'question'},
                        {text: (waitlistInfo.consent_emergency_contact) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.consent_collect_child?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'I consent to be an authorised nominee to collect this child:', style: 'question'},
                        {text: (waitlistInfo.consent_collect_child) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.consent_make_medical_decision?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {
                            text: 'I consent to be an authorised nominee to make medical decisions on behalf of this child:',
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent_make_medical_decision) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.consent_incursion?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {
                            text: `I consent to be an authorised nominee for this child's incursions and excursions:`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent_incursion) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_aboriginal?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Are you of Aboriginal or Torres Strait Islander descent?', style: 'question'},
                        {
                            text: (waitlistInfo.parent_aboriginal) ? waitlistInfo.parent_aboriginal : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.parent_cultural_background?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `What is your cultural background?`, style: 'question'},
                        {
                            text: (waitlistInfo.parent_cultural_background) ? waitlistInfo.parent_cultural_background : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.parent_spoken_language?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'What language is spoken at home?', style: 'question'},
                        {
                            text: (waitlistInfo.parent_spoken_language) ? waitlistInfo.parent_spoken_language : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.parent_crn?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Primary Carer CRN:`, style: 'question'},
                        {text: (waitlistInfo.parent_crn) ? waitlistInfo.parent_crn : 'N/A', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        const parentAdditional = _.filter(waitlistInfo.new_inputs, {section: 'parent_guardian'});

        if (parentAdditional.length > 0) {

            for (let rec of parentAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${rec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(rec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        content.push({text: 'Parent 2/Additional Carer', style: 'subheader'});

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_firstname?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'First Name:', style: 'question'},
                        {text: (waitlistInfo.carer_firstname) ? waitlistInfo.carer_firstname : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_middlename?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Middle Name:', style: 'question'},
                        {text: (waitlistInfo.carer_middlename) ? waitlistInfo.carer_middlename : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_lastname?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Last Name:', style: 'question'},
                        {text: (waitlistInfo.carer_lastname) ? waitlistInfo.carer_lastname : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_dob?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'DOB:', style: 'question'},
                        {text: (waitlistInfo.carer_dob) ? waitlistInfo.carer_dob : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_email?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Email:', style: 'question'},
                        {text: (waitlistInfo.carer_email) ? waitlistInfo.carer_email : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_relationship?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Relationship:', style: 'question'},
                        {
                            text: (waitlistInfo.carer_relationship) ? waitlistInfo.carer_relationship : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_address?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Address:', style: 'question'},
                        {text: (waitlistInfo.carer_address) ? waitlistInfo.carer_address : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_suburb?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Suburb:', style: 'question'},
                        {text: (waitlistInfo.carer_suburb) ? waitlistInfo.carer_suburb : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_country?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Country:', style: 'question'},
                        {text: (waitlistInfo.carer_country) ? waitlistInfo.carer_country : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_postalCode?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Postal Code:', style: 'question'},
                        {text: (waitlistInfo.carer_postalCode) ? waitlistInfo.carer_postalCode : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_state?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'State:', style: 'question'},
                        {text: (waitlistInfo.carer_state) ? waitlistInfo.carer_state : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_phone?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Phone:', style: 'question'},
                        {text: (waitlistInfo.carer_phone) ? waitlistInfo.carer_phone : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_mobile?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Mobile:', style: 'question'},
                        {text: (waitlistInfo.carer_mobile) ? waitlistInfo.carer_mobile : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_occupation?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Occupation:', style: 'question'},
                        {text: (waitlistInfo.carer_occupation) ? waitlistInfo.carer_occupation : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_work_address?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Work Address:', style: 'question'},
                        {
                            text: (waitlistInfo.carer_work_address) ? waitlistInfo.carer_work_address : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_work_email?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Work Email:', style: 'question'},
                        {text: (waitlistInfo.carer_work_email) ? waitlistInfo.carer_work_email : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        if (elementSettings.carer_work_phone?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Work Phone Number:', style: 'question'},
                        {text: (waitlistInfo.carer_work_phone) ? waitlistInfo.carer_work_phone : 'N/A', style: 'answer'}
                    ],
                    width: '33%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.care_consent_eme_contact?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'I consent to be an emergency contact:', style: 'question'},
                        {text: (waitlistInfo.care_consent_eme_contact) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.carer_consent_collect_child?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'I consent to be an authorised nominee to collect this child:', style: 'question'},
                        {text: (waitlistInfo.carer_consent_collect_child) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.care_consent_mak_medi_deci?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {
                            text: 'I consent to be an authorised nominee to make medical decisions on behalf of this child:',
                            style: 'question'
                        },
                        {text: (waitlistInfo.care_consent_mak_medi_deci) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.carer_consent_incursion?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {
                            text: `I consent to be an authorised nominee for this child's incursions and excursions:`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.carer_consent_incursion) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_aboriginal?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'Are you of Aboriginal or Torres Strait Islander descent?', style: 'question'},
                        {text: (waitlistInfo.carer_aboriginal) ? waitlistInfo.carer_aboriginal : 'N/A', style: 'answer'}
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.carer_cultural_background?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `What is your cultural background?`, style: 'question'},
                        {
                            text: (waitlistInfo.carer_cultural_background) ? waitlistInfo.carer_cultural_background : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        intermediateArr = {
            columns: [],
            columnGap: 10
        };

        if (elementSettings.carer_spoken_language?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: 'What language is spoken at home?', style: 'question'},
                        {
                            text: (waitlistInfo.carer_spoken_language) ? waitlistInfo.carer_spoken_language : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        if (elementSettings.addition_carer_crn?.hidden == 1) {
            intermediateArr.columns.push(
                {
                    stack: [
                        {text: `Additional Carer CRN:`, style: 'question'},
                        {
                            text: (waitlistInfo.addition_carer_crn) ? waitlistInfo.addition_carer_crn : 'N/A',
                            style: 'answer'
                        }
                    ],
                    width: '50%',
                }
            );
        }

        content.push(intermediateArr);

        const carerAdditional = _.filter(waitlistInfo.new_inputs, {section: 'additional_carer_details'});

        if (carerAdditional.length > 0) {

            for (let rec of carerAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${rec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(rec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        if (waitlistInfo.emergencyContacts && waitlistInfo.emergencyContacts.length > 0) {

            content.push({text: 'Emergency Contact Information', style: 'subheader'});

            for (let contact of waitlistInfo.emergencyContacts) {

                intermediateArr = {
                    columns: [],
                    columnGap: 10
                };

                if (elementSettings.ec_firstname?.hidden == 1) {
                    intermediateArr.columns.push(
                        {
                            stack: [
                                {text: 'First Name:', style: 'question'},
                                {text: (contact.ec_firstname) ? contact.ec_firstname : 'N/A', style: 'answer'}
                            ],
                            width: '33%',
                        }
                    );
                }

                if (elementSettings.ec_lastname?.hidden == 1) {
                    intermediateArr.columns.push(
                        {
                            stack: [
                                {text: 'Last Name:', style: 'question'},
                                {text: (contact.ec_lastname) ? contact.ec_lastname : 'N/A', style: 'answer'}
                            ],
                            width: '33%',
                        }
                    );
                }

                if (elementSettings.ec_phone?.hidden == 1) {
                    intermediateArr.columns.push(
                        {
                            stack: [
                                {text: 'Mobile:', style: 'question'},
                                {text: (contact.ec_phone) ? contact.ec_phone : 'N/A', style: 'answer'}
                            ],
                            width: '33%',
                        }
                    );
                }

                content.push(intermediateArr);

                intermediateArr = {
                    columns: [],
                    columnGap: 10
                };

                if (elementSettings.ec_address?.hidden == 1) {
                    intermediateArr.columns.push(
                        {
                            stack: [
                                {text: 'Home Address:', style: 'question'},
                                {text: (contact.ec_address) ? contact.ec_address : 'N/A', style: 'answer'}
                            ],
                            width: '33%',
                        }
                    );
                }

                if (elementSettings.ec_email?.hidden == 1) {
                    intermediateArr.columns.push(
                        {
                            stack: [
                                {text: 'Email:', style: 'question'},
                                {text: (contact.ec_email) ? contact.ec_email : 'N/A', style: 'answer'}
                            ],
                            width: '33%',
                        }
                    );
                }

                if (elementSettings.ec_relationship?.hidden == 1) {
                    intermediateArr.columns.push(
                        {
                            stack: [
                                {text: 'Relationship:', style: 'question'},
                                {text: (contact.ec_relationship) ? contact.ec_relationship : 'N/A', style: 'answer'}
                            ],
                            width: '33%',
                        }
                    );
                }

                content.push(intermediateArr);
            }

        }

        const emergancyAdditional = _.filter(waitlistInfo.new_inputs, {section: 'emergency_contact_details'});

        if (emergancyAdditional.length > 0) {

            for (let rec of emergancyAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${rec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(rec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        content.push({text: 'Consents', style: 'subheader'});

        if (elementSettings.consent1?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `Do you consent for the service to seek medical treatment for your child from a medical practitioner, hospital or ambulance in the event you cannot be contacted?`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent1) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent2?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `Do you consent for your child to be transported by an ambulance service?`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent2) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent3?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `I give permission for educators with current first aid to administer paracetamol in an emergency in the correct dosage for the age of my child. Administration of this medication will only be given in the event of a parent being un-contactable in consultation with the director or nominated supervisor:`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent3) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent4?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `Do you consent for the service to apply sunscreen for your child before outdoor activities and excursions?`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent4) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent5?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `Do you consent for the service to administer Ventolin or Epi-pen to your child in case of emergency?`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent5) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent6?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `I agree to accurately record the time of arrival and departure of my child from the service in accordance with the service requirements:`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent6) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent7?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `I give permission for educators and school teachers/principals to share information about my child in relation to their care and wellbeing:`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent7) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        if (elementSettings.consent8?.hidden == 1) {
            content.push(
                {
                    text: [
                        {
                            text: `I agree to notify the service when my child is to be collected by any person:`,
                            style: 'question'
                        },
                        {text: (waitlistInfo.consent8) ? 'Yes' : 'No', style: 'answer'}
                    ],
                    style: 'newLine'
                }
            );
        }

        const consentsAdditional = _.filter(waitlistInfo.new_inputs, {section: 'consents'});

        if (consentsAdditional.length > 0) {

            for (let rec of consentsAdditional) {

                content.push(
                    {
                        text: [
                            {text: `${rec.question}:`, style: 'question'},
                            {text: this.getAdditionalAnswer(rec), style: 'answer'}
                        ],
                        style: 'newLine'
                    }
                );

            }

        }

        const styles = {
            header: {
                fontSize: 21,
                margin: [0, 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0, 8, 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                margin: [0, 15, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 16,
                bold: false,
                margin: [0, 12, 0, 10]
            },
            question: {
                bold: true,
                fontSize: 10,
                margin: [0, 8, 0, 0]
            },
            answer: {
                bold: false,
                fontSize: 10
            },
            newLine: {
                margin: [0, 10, 0, 0]
            },
            row: {
                margin: [0, 10, 0, 0]
            }
        };


        this._pdfHelperService
            .generatePDF('open', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch((error: any) => {
                throw error;
            });

    }

    public setEmergencyContactsSettings(data: any): void {
        this.emergencyContactsSettings.next(data);
    }

    public getEmergencyContactsSettings(): Observable<any> {
        return this.emergencyContactsSettings.asObservable();
    }

    crmOwnBranchChange(params: any): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/crm-branch-change`, params)
            .pipe(
                map((response) => {
                    if (response.code === 200) {
                        this.getwaitlist();
                    }
                    return response.code;
                }), shareReplay()
            );
    }

    getRooms(userId: string = ''): Observable<any> {
        let params = new HttpParams();

        if (userId !== '') {
            params = params.set('id', userId);
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-branch-room-list`, {params})
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Room(i, idx))),
                shareReplay()
            );
    }

    printCRM(item, countriesList, action): void {
        const bookingDisplay = {};
        let ampm: string;
        let bookings = [];

        if (_.isEmpty(item?.waitlist_info?.bookings)) {
            bookings = [];
        } else if (_.isArray(item?.waitlist_info?.bookings)) {
            bookings = item?.waitlist_info?.bookings;
        } else {
            bookings = [item?.waitlist_info?.bookings];
        }

        for (const bookItem of bookings) {
            ampm = bookItem?.mornings || undefined;

            for (const day in bookItem) {
                if (bookItem[day] === true && day !== 'mornings') {
                    if (_.has(bookingDisplay, day)) {
                        bookingDisplay[day] = bookingDisplay[day] + ',' + ampm;
                    } else {
                        bookingDisplay[day] = ampm === undefined ? 'Yes' : ampm;
                    }
                } else if (bookItem[day] === false && day !== 'mornings') {
                    bookingDisplay[day] = false;
                }
            }

        }

        const newItem = {...item};


        const allergylist = this.onAllergyChanged.value || [];

        if (allergylist.length > 0) {
            for (const key in newItem.waitlist_info.allergiesArray) {

                const allergyrec = allergylist.find(x => x.index === newItem.waitlist_info.allergiesArray[key].allergies);

                newItem.waitlist_info.allergiesArray[key]['name'] = allergyrec?.name || '';
            }
        }


        this.designPrintCRM(newItem, countriesList, bookingDisplay, action);
    }

    getwaitlistForPrint(): Promise<any> {

        return new Promise((resolve, reject) => {
            // set table loader
            this.onTableLoaderChanged.next(true);

            if (_.isNull(this.pagination)) {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('page', this.pagination.page)
                .set('offset', '1000')
                .set('search', this.searchText)
                .set('filters', JSON.stringify(this.filterBy));

            if (!_.isNull(this.filterBy)) {
                this.currentType = this.filterBy.status;
            }

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-waitlist`, {params})
                .pipe(
                    map((response) => {
                        this.waitlistModel = response.data.map((i: any, idx: number) => new WaitlistEnrollment(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.waitlistModel],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                        };

                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onWaitlistPrintDataChanged.next(response);

                        resolve(null);
                    },
                    reject
                );
        });
    }

    downLoadCsv(heading: any, field, countriesList): void {
        const sections = (field.status === '2' || field.status === '3') ? (field.enrolment_sections || []) : (field.status === '0' || field.status === '1') ? (field.waitlist_sections || []) : (field.enquiry_sections || []);
        const allInputs = field.all_inputs;
        const masterRows = [];
        const bookingDisplay = this.bookingConvert(field);
        for (const section of sections) {
            masterRows.push({
                'SECTION': section['name'],
                'QUESTION': '',
                'ANSWER': '',
                'Mon': '',
                'Tue': '',
                'Wed': '',
                'Thu': '',
                'Fri': '',
                'All Days': '',
            });
            for (const inputName of section.inputs) {

                if (section['code'] === 'emergency_contact_details') {
                    if (inputName !== 'addEmergencyContact') {
                        continue
                    }
                }
                const input = allInputs[allInputs.findIndex((val) => val.name === inputName)];
                const questionOnly = input.input_type === 'richTextBox' || input.input_type === 'hyperlink'

                if (input === 'parentCountry' || input === 'additionalCarerCountry') {
                    input.values = (input.values !== '' && input.values !== null) ? !_.isEmpty(countriesList.find(e => e.code === input.values)) ? countriesList.find(e => e.code === input.values)['name'] : input.values : '';
                }

                let row = {};
                if (inputName === 'addEmergencyContact') {
                    let emergencyCounter = 1;
                    for (const emeRow of input['values']) {

                        masterRows.push({
                            'SECTION': 'Emergency Contact ' + emergencyCounter++,
                            'QUESTION': '',
                            'ANSWER': '',
                            'Mon': '',
                            'Tue': '',
                            'Wed': '',
                            'Thu': '',
                            'Fri': '',
                            'All Days': '',
                        });

                        for (const emeInputName of section.inputs) {
                            if (emeInputName !== 'addEmergencyContact') {
                                const emInput = allInputs[allInputs.findIndex((val) => val.name === emeInputName)];
                                const emQuestionOnly = emInput.input_type === 'richTextBox' || emInput.input_type === 'hyperlink'

                                row = {
                                    'SECTION': '',
                                    'QUESTION': emInput.question.replace(/<\/?[^>]+(>|$)/g, '') + (!emQuestionOnly ? ' : ' : ''),
                                    'ANSWER': !emQuestionOnly ? this.valuesConverter(emInput.input_type, emeRow[emeInputName]) : '',
                                    'Mon': '',
                                    'Tue': '',
                                    'Wed': '',
                                    'Thu': '',
                                    'Fri': '',
                                    'All Days': '',
                                };
                                masterRows.push(row);
                            }
                        }
                    }

                } else if (inputName === 'attendance' || inputName === 'preferedDate') {
                    row = {
                        'SECTION': '',
                        'QUESTION': input.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                        'ANSWER': '',
                        'Mon': (bookingDisplay['monday']) ? bookingDisplay['monday'] : 'N/A',
                        'Tue': (bookingDisplay['tuesday']) ? bookingDisplay['tuesday'] : 'N/A',
                        'Wed': (bookingDisplay['wednesday']) ? bookingDisplay['wednesday'] : 'N/A',
                        'Thu': (bookingDisplay['thursday']) ? bookingDisplay['thursday'] : 'N/A',
                        'Fri': (bookingDisplay['friday']) ? bookingDisplay['friday'] : 'N/A',
                        'All Days': (bookingDisplay['allDays']) ? bookingDisplay['allDays'] : 'N/A',
                    };
                } else if (inputName === 'addAllergy') {
                    masterRows.push({
                        'SECTION': '',
                        'QUESTION': 'Allergy/Dietary Requirements Details',
                        'ANSWER': '',
                        'Mon': '',
                        'Tue': '',
                        'Wed': '',
                        'Thu': '',
                        'Fri': '',
                        'All Days': '',
                    });
                    for (const allergy of this.allergiesConvert(field)) {
                        masterRows.push({
                            'SECTION': '',
                            'QUESTION': allergy.name,
                            'ANSWER': allergy.detailsOfAllergies,
                            'Mon': '',
                            'Tue': '',
                            'Wed': '',
                            'Thu': '',
                            'Fri': '',
                            'All Days': '',
                        });
                    }

                } else {
                    row = {
                        'SECTION': '',
                        'QUESTION': input.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                        'ANSWER': !questionOnly ? this.valuesConverter(input.input_type, input.values) : '',
                        'Mon': '',
                        'Tue': '',
                        'Wed': '',
                        'Thu': '',
                        'Fri': '',
                        'All Days': '',
                    };
                }
                masterRows.push(row);
            }

        }

        if (masterRows.length > 0) {
            const csvData = this.objectToCsv(masterRows);
            this._csvService
                .downLoadCsvFile(csvData, heading);
        } else {
            setTimeout(() => this._notification.displaySnackBar('No data found', NotifyType.INFO), 200);
            return;
        }


    }

    objectToCsv(data: any): any {

        const csvRows = [];

        const headers = _.keys(_.first(data));

        csvRows.push(headers.join(','));

        for (const row of data) {

            const value = headers.map(header => {
                if (row[header]) {
                    return `"${row[header].toString().replace(/[",]/g, '')}"`;
                }
            });

            csvRows.push(value.join(','));

        }

        return csvRows.join('\n');
    }

    bookingConvert(item): any[] {
        let bookingDisplay = [];
        let ampm: string;
        let bookings = [];

        if (_.isEmpty(item?.waitlist_info?.bookings)) {
            bookings = [];
        } else if (_.isArray(item?.waitlist_info?.bookings)) {
            bookings = item?.waitlist_info?.bookings;
        } else {
            bookings = [item?.waitlist_info?.bookings];
        }

        for (const bookItem of bookings) {
            ampm = bookItem?.mornings || undefined;

            for (const day in bookItem) {
                if (bookItem[day] === true && day !== 'mornings') {
                    if (_.has(bookingDisplay, day)) {
                        bookingDisplay[day] = bookingDisplay[day] + ',' + ampm;
                    } else {
                        bookingDisplay[day] = ampm === undefined ? 'Yes' : ampm;
                    }
                } else if (bookItem[day] === false && day !== 'mornings') {
                    bookingDisplay[day] = false;
                }
            }

        }
        return bookingDisplay;
    }


    allergiesConvert(newItem): any {
        const allergylist = this.onAllergyChanged.value;
        if (allergylist.length > 0) {
            for (const key in newItem.waitlist_info.allergiesArray) {

                const allergyrec = allergylist.find(x => x.index === newItem.waitlist_info.allergiesArray[key].allergies);

                newItem.waitlist_info.allergiesArray[key]['name'] = allergyrec?.name || '';

            }
        }
        return newItem.waitlist_info.allergiesArray;
    }


    /**
     * clear all last remembered options
     */
    clearLastRememberOptions(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize
        this._unsubscribeAll = new Subject();
        this.waitlistModel = [];
        this.currentType = 5;
        this.searchText = null;
        this.defaultPageIndex = 1;
        this.defaultPageSize = 5;
        this.defaultPageSizeOptions = [5, 10, 20];
        this.searchText = null;
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

}
