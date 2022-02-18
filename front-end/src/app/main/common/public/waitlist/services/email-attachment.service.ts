import {Injectable, OnInit} from '@angular/core';
import {S3UploadDirectService} from 'app/shared/components/s3-upload/s3-upload-direct.service';
import {isArray} from 'util';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {UrlHelper} from 'app/utils/url.helper';
import * as _ from 'lodash';
import {PDFHelperService} from 'app/shared/service/pdf-helper.service';
import {HttpEvent, HttpEventType} from '@angular/common/http';


@Injectable()
export class EmailAttachmentService implements OnInit {

    uploadedFileName: string
    private text: string;

    constructor(
        private _s3UploadDirectService: S3UploadDirectService,
        private _pdfService: PDFHelperService,
    ) {
        this.uploadedFileName = ''
    }

    ngOnInit(): void {
    }

    getDomainName(): string {
        return UrlHelper.extractTenantNameFromUrl(location.host);
    }


    dataArray(sections, formData, checkBoxes): any {
        const pageType = 'A4';
        const pageTitle = 'Waitlist Form';
        const isLandscape = false;
        // tslint:disable-next-line:variable-name
        const content = [];
        let intermediateArr = null;

        content.push(
            {text: pageTitle, style: 'header'},
            {
                canvas: [{
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: this._pdfService.getPageSize(isLandscape, pageType).width - 40,
                    y2: 0,
                    lineWidth: 1
                }]
            },
        );

        sections.forEach(g => {
                content.push({text: g.title, style: 'subheader'});
                intermediateArr = {
                    columns: [],
                    columnGap: 10
                };
                const bookingDisplay = {};
                let columns3 = 0;
                g.inputs.forEach(s => {
                    if (formData[g.section_code]?.[s.input_name] !== undefined) {

                        if (typeof (formData[g.section_code][s.input_name][s.input_name]) === 'boolean') {
                            if (s.input_type === 'checkbox' && checkBoxes[s.input_name] !== undefined && isArray(checkBoxes[s.input_name]) && checkBoxes[s.input_name].length > 0) {
                                this.text = (checkBoxes[s.input_name].length > 0) ? (checkBoxes[s.input_name]).toString() : 'No'
                            } else {
                                this.text = (formData[g.section_code][s.input_name][s.input_name]) ? 'Yes' : 'No'
                            }
                        } else if (s.input_type === 'signature') {
                            this.text = checkBoxes[s.input_name] ?? 'N/A';
                        } else if (s.input_name === 'attendance') {

                            let ampm: string;

                            const bookings = [{...formData[g.section_code][s.input_name][0]}];

                            for (const bookItem of bookings) {
                                ampm = bookItem.mornings;

                                for (const day in bookItem) {
                                    if (bookItem[day] === true && day !== 'mornings') {
                                        if (_.has(bookingDisplay, day)) {
                                            bookingDisplay[day] = bookingDisplay[day] + ',' + ampm;
                                        } else {
                                            bookingDisplay[day] = ampm === undefined ? 'Yes' : ampm;
                                        }
                                    }
                                }

                            }

                        } else if (typeof (formData[g.section_code][s.input_name][s.input_name]) === null || (formData[g.section_code][s.input_name][s.input_name]) === '') {
                            this.text = (s.input_type === 'switch') ? 'No' : 'N/A';
                        } else {
                            if (s.input_type === 'date-picker') {
                                this.text = DateTimeHelper.getUtcDate(formData[g.section_code][s.input_name][s.input_name])
                            } else if (s.input_type === 'select' || s.input_type === 'select-multiple') {
                                this.text = (formData[g.section_code][s.input_name][s.input_name]).toString() === '' ? 'N/A' : formData[g.section_code][s.input_name][s.input_name];
                            } else if (s.input_type === 'radio-group') {
                                this.text = formData[g.section_code][s.input_name][s.input_name] == 1 ? 'Female' : 'Male'
                            } else {
                                this.text = formData[g.section_code][s.input_name][s.input_name]
                            }

                        }

                        const answer = this.text;
                        const questionOnly = s.input_type === 'richTextBox' || s.input_type === 'hyperlink'
                        // console.log('questionOnly')
                        // console.log(s.question.replace(/<\/?[^>]+(>|$)/g, '') + ' ' + questionOnly);
                        // if (s.input_type === 'signature') {
                        //     content.push(
                        //         {
                        //             image: 'data:image/png;base64,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',
                        //             width: '100',
                        //             height: '30',
                        //             alignment: 'left'
                        //         }
                        //     );
                        // } else
                        if ((s.column_height === '33' || s.column_height === '50' || s.column_height === '66' || s.column_height === '70') && !(s.input_name === 'attendance' || s.input_name === 'preferedDate')) {

                            const thisFieldSize = s.column_height === '33' ? 1 : s.column_height === '66' || s.column_height === '70' ? 2 : s.column_height === '50' ? 1.5 : 0
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
                                            text: s.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                            style: (!questionOnly ? 'question' : 'answer')
                                        },
                                        {
                                            text: (!questionOnly ? answer : ''),
                                            style: 'answer'
                                        }
                                    ],
                                    width: s.column_height === '70' ? '66%' : s.column_height + '%',
                                }
                            );


                        } else if ((s.column_height === '80' || s.column_height === '100') && !(s.input_name === 'attendance' || s.input_name === 'preferedDate')) {
                            if ((intermediateArr.columns).length > 0) {
                                content.push(intermediateArr);
                            }

                            if (s.input_type === 'signature') {
                                if (answer !== 'N/A' && answer !== '') {
                                    content.push(
                                        {
                                            text: [
                                                {
                                                    text: s.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                                    style: (!questionOnly ? 'question' : 'answer')
                                                },
                                            ],
                                            style: 'newLine'
                                        }, {
                                            image: answer,
                                            width: '300',
                                        }
                                    );
                                } else {
                                    content.push(
                                        {
                                            text: [
                                                {
                                                    text: s.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                                    style: (!questionOnly ? 'question' : 'answer')
                                                },
                                                {
                                                    text: (!questionOnly ? answer : ''),
                                                    style: 'answer'
                                                }
                                            ],
                                            style: 'newLine'
                                        }
                                    );
                                }

                            } else {
                                content.push(
                                    {
                                        text: [
                                            {
                                                text: s.question.replace(/<\/?[^>]+(>|$)/g, '') + (!questionOnly ? ' : ' : ''),
                                                style: (!questionOnly ? 'question' : 'answer')
                                            },
                                            {
                                                text: (!questionOnly ? answer : ''),
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
                        } else if ((s.input_name === 'attendance' || s.input_name === 'preferedDate')) { /*tables */
                            if ((intermediateArr.columns).length > 0) {
                                content.push(intermediateArr);
                            }

                            content.push(
                                {
                                    text: [
                                        {
                                            text: s.question.replace(/<\/?[^>]+(>|$)/g, '') + ' : ',
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

                        }


                    }

                })
                /*last fields add which nod added to content*/
                if ((intermediateArr.columns).length > 0) {
                    content.push(intermediateArr);
                }
            }
        )
        return content;
    }


    convertToPDF(sections, formData, checkBoxes, path): Promise<string> {

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const fileName = 'waitlist form'
                const fileTitle = 'waitlist.pdf'
                const styles = {
                    header: {
                        fontSize: 21,
                        margin: [0, 0, 0, 8],
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
                }
                const content = this.dataArray(sections, formData, checkBoxes);

                this._pdfService
                    .generatePDF('blob', false, 'A4', fileName, content, styles, _.snakeCase(_.toLower(fileTitle)))
                    .then(value => {
                        setTimeout(() => {
                            this.uploadFile(this._pdfService.attachFile, fileTitle, path).then(value1 => {
                                resolve(value1);
                            });
                        }, 200)

                    })
                    .catch(error => {
                        throw error;
                    });
            }, 1000);
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

    uploadFile(docFile: File, fileTitle: string, path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this._s3UploadDirectService.attachmentSend(fileTitle, docFile, path)
                    .pipe()
                    .subscribe(
                        (event: HttpEvent<any>) => {
                            switch (event.type) {
                                case HttpEventType.Response:
                                    this._s3UploadDirectService.changeFile.subscribe(
                                        value => this.uploadedFileName = value[0].key
                                    )
                                    resolve(this.uploadedFileName);
                                    break;
                            }
                        },
                        (error) => {
                            throw error;
                        }
                    );

            }, 300);
        })

    }

}
