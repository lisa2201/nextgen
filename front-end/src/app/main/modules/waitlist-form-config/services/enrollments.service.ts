import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {map,  shareReplay,  tap} from 'rxjs/operators';

import * as _ from 'lodash';

import {HttpClient, HttpParams} from '@angular/common/http';
import {AppConst} from 'app/shared/AppConst';
import {SectionService} from './section.service';
import {AuthService} from 'app/shared/service/auth.service';
import {PDFHelperService} from 'app/shared/service/pdf-helper.service';
import {Sections} from '../models/sections.model';

@Injectable()
export class EnrollmentsService {
    branchDetails: any;

    constructor(
        private _httpClient: HttpClient,
        private _sectionService: SectionService,
        private _auth: AuthService,
        private _pdfHelperService: PDFHelperService
    ) {
        this.branchDetails = this._auth.getClient();
    }

    private _refreshNeed = new Subject<void>();
    saveButtonActivate = new Subject<boolean>();

    get refreshNeed() {
        return this._refreshNeed
    }

    storeWaitListChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/child-wait-list-store`, postData)
            .pipe(
                map((response) => {

                    return response.message;

                })
            );

    }

    enrollChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/enroll-child`, postData)
            .pipe(
                map((response) => {

                    return response.message;

                })
            );

    }

    enrollChildMasterData(postData: any): Observable<any> {
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/enroll-child-master`, postData)
            .pipe(
                tap(() => {
                    this._refreshNeed.next();
                }),
                map((response) => {
                    // this._sectionService.enrolmentDynamicFields(postData.settingsMaster);
                    return response;

                }),
                shareReplay()
            );

    }

    /**
     * Get enrollment details
     *
     * @returns {Observable<any>}
     */

    getEnrolInfo(index: any): Observable<any> {

        const params = new HttpParams().set('id', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrollment-info`, {params})
            .pipe(
                map(response => {
                        return (response.data)
                    }
                ),
                shareReplay()
            );

    }

    storeNewInput(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/new-input-save`, postData)
            .pipe(
                tap(() => {
                    this._refreshNeed.next();
                }),
                map((response) => {
                    this._sectionService.enrolmentDynamicFields(postData.settingsMaster);
                    return response;

                }), shareReplay()
            );

    }

    getAllergyTypes(): Observable<any> {
        const params = new HttpParams().set('branch_id', (this.branchDetails?.id != null) ? this.branchDetails.id : '');// site manager for no allergies. then load branch 1 allergies for site manager
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-allergy-types`, {params})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length < 1) {
                        return {};
                    } else {
                        return {
                            allergyTypes: response.data
                        };
                    }
                }),
                shareReplay()
            );
    }

    addNewSection(postData: any): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-section`, postData)
            .pipe(
                tap(() => {
                    this._refreshNeed.next();
                }),
                map((response) => {
                    this._sectionService.enrolmentDynamicFields(postData.settingsMaster);
                    return response;

                }), shareReplay()
            );
    }

    removeField(postData): Observable<any> {
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/remove-field`, postData)
            .pipe(
                tap(() => {
                    this._refreshNeed.next();
                }),
                map((response) => {
                    this._sectionService.enrolmentDynamicFields(postData.settingsMaster);
                    return response;

                }), shareReplay()
            );

    }

    sectionRemove(post): Observable<any> {
        return this._httpClient.post<Sections>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/section-remove`, post)
            .pipe(
                tap(() => {
                    this._refreshNeed.next();
                }),
                map((response) => {
                    this._sectionService.enrolmentDynamicFields(post.settingsMaster);
                    return response;

                }), shareReplay()
            );
    }

    public setSaveButtonActivate(status: boolean): void {
        this.saveButtonActivate.next(status);
    }

    public getSaveButtonActivate(): Observable<any> {
        return this.saveButtonActivate.asObservable();
    }

    resetIntermediateArray(): any {
        return {
            columns: [],
            columnGap: 10
        };
    }

    printEmptyEnrolment(data: any, printConfig: any): void {


        const pageTitle = 'Enrolment Form';
        const pageType = 'A4';
        const isLandscape = false;
        const emergencyContactCount = printConfig.emergencyContacts || 0;
        const allergyTypesCount = printConfig.allergies || 0;
        const allergyList = printConfig.allergyTypes || [];

        let waitlistInfo = _.cloneDeep(data); // mutating the array below

        if (emergencyContactCount > 0) {

            const emIndex = _.findIndex(waitlistInfo, {section_code: 'emergency_contact_details'});

            if (emIndex !== -1) {

                const objtocopy = _.assign({}, waitlistInfo[emIndex]);

                for (let i = 0; i < emergencyContactCount; i++) {

                    const newObj = {...objtocopy, ...{title: `${objtocopy.title} ${emergencyContactCount === 1 ? '' : (i + 1)}`}};
                    const insertIndex = 1 + emIndex + i;

                    waitlistInfo.splice(insertIndex, 0, newObj);

                }

                waitlistInfo.splice(emIndex, 1);

            }

        }

        if (allergyTypesCount > 0) {

            const healthIndex = _.findIndex(waitlistInfo, {section_code: 'health_information'});

            if (healthIndex !== -1) {

                const sectionRecord = {...waitlistInfo[healthIndex]};

                const addAllergyIndex = _.findIndex(sectionRecord.inputs, {input_name: 'addAllergy'});

                if (addAllergyIndex !== -1) {

                    const objtocopy = _.assign({}, sectionRecord.inputs[addAllergyIndex]);

                    let initialInsertIndex = addAllergyIndex + 1;

                    if (allergyList && allergyList.length > 0) {

                        const allergyListObj = {
                            ...objtocopy,
                            ...{
                                question: 'Available allergies',
                                column_height: 90,
                                input_name: 'available_allergies'
                            }
                        };

                        waitlistInfo[healthIndex].inputs.splice(initialInsertIndex, 0, allergyListObj);

                        initialInsertIndex++;

                    }

                    for (let i = 0; i < allergyTypesCount; i++) {

                        const newObj1 = {
                            ...objtocopy,
                            ...{
                                question: `Does your child have any allergies/dietary requirements?`,
                                column_height: 49,
                                input_name: 'allergy_question'
                            }
                        };

                        waitlistInfo[healthIndex].inputs.splice(initialInsertIndex, 0, newObj1);

                        initialInsertIndex++;

                        const newObj2 = {
                            ...objtocopy,
                            ...{
                                question: `Details of allergies/dietary requirements`,
                                column_height: 49,
                                input_name: 'allergy_detail'
                            }
                        };

                        waitlistInfo[healthIndex].inputs.splice(initialInsertIndex, 0, newObj2);

                        initialInsertIndex++;

                    }

                    waitlistInfo[healthIndex].inputs.splice(addAllergyIndex, 1);

                }


            }

        }

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
            }
        );

        for (const section of waitlistInfo) {

            if (section.section_hide === true) {
                continue;
            }

            content.push({text: section.title, style: 'subheader'});

            intermediateArr = this.resetIntermediateArray();

            let currentWidth = 0;

            for (const input of section.inputs) {

                if (input.hidden === true || input.input_name === 'addAllergy') {
                    continue;
                }

                const width = input.column_height ? parseInt(input.column_height, 10) : 100;

                currentWidth += width;

                let question = `${input.question}${_.last(input.question) === '?' ? '' : ':'}`;
                question = question.replace(/<\/?[^>]+(>|$)/g, '');

                if (input.input_type === 'switch') {
                    question = `${question} (Yes/No)`;
                } else if (input.input_type === 'select') {
                    question = `${question} (Select One)`;
                } else if (input.input_type === 'select-multiple') {
                    question = `${question} (Select Multiple)`;
                } else if (input.input_type === 'date-picker') {
                    question = `${question} (YYYY/MM/DD)`;
                } else if (input.input_type === 'checkbox') {
                    if (input?.types?.multiple === true) {
                        question = `${question} (Select Multiple)`;
                    } else {
                        question = `${question} (Yes/No)`;
                    }
                } else if (input.input_type === 'select-checkbox' && input.input_name === 'preferedDate') {
                    question = `${question} (Select Multiple)`;
                }

                const inputObj: any = {
                    stack: [
                        {text: question, style: 'question'}
                    ],
                    width: `${width}%`,
                };

                if (input.input_type === 'select' && input.types?.options) {

                    const selectOptions = {
                        type: 'circle',
                        ul: _.map(input.types.options, (val) => (_.isArray(val) ? _.first(val) : val))
                    };

                    inputObj.stack.push(selectOptions);

                } else if (input.input_type === 'select-multiple' && input.types?.options) {

                    const selectOptions = {
                        type: 'circle',
                        ul: _.map(input.types.options, (val) => (_.isArray(val) ? _.first(val) : val))
                    };

                    inputObj.stack.push(selectOptions);

                } else if (input.input_type === 'checkbox') {

                    if (input?.types?.multiple === true) {

                        const checkBoxOptions = {
                            type: 'square',
                            ul: _.map(input.types.options, (val) => val)
                        };

                        inputObj.stack.push(checkBoxOptions);
                    }

                } else if (input.input_type === 'select-checkbox' && input.input_name === 'preferedDate') {

                    const checkBoxOptions = {
                        type: 'square',
                        ul: [
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                            'Sunday',
                            'I am fully flexible on days'
                        ]
                    };

                    inputObj.stack.push(checkBoxOptions);

                } else if (input.input_type === 'textboxArray' && input.input_name === 'available_allergies') {

                    const checkBoxOptions = {
                        type: 'square',
                        ul: _.map(allergyList, (val) => _.capitalize(val.name))
                    };

                    inputObj.stack.push(checkBoxOptions);

                }

                if (currentWidth <= 100) {

                    intermediateArr.columns.push(inputObj);

                } else {

                    currentWidth = width;

                    content.push(intermediateArr);

                    intermediateArr = this.resetIntermediateArray();

                    intermediateArr.columns.push(inputObj);

                }


            }

            if (intermediateArr.columns && intermediateArr.columns.length > 0) {
                content.push(intermediateArr);
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
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 16,
                bold: false,
                margin: [0, 12, 0, 2]
            },
            question: {
                bold: true,
                fontSize: 10,
                margin: [0, 14, 0, 0]
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
}


