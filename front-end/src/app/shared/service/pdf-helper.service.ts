import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'assets/pdf/vfs_fonts';
import pageSizes from 'pdfmake/src/standardPageSizes';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
pdfMake.fonts = {
    Quicksand: {
        normal: 'Quicksand-Regular.ttf',
        bold: 'Quicksand-Bold.ttf',
        italics: 'Quicksand-Light.ttf',
        bolditalics: 'Quicksand-Bold.ttf'
    }
};

import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

import { NotifyType } from '../enum/notify-type.enum';
import { AppConst } from '../AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { UrlHelper } from 'app/utils/url.helper';

@Injectable({
    providedIn: 'root'
})
export class PDFHelperService {

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {HttpClient} _httpClient
     * @param {NotificationService} _notification
     */

    public attachFile :any

    constructor(
        private _logger: NGXLogger,
        private _httpClient: HttpClient,
        private _notification: NotificationService,
        private _authService: AuthService
    )
    {

    }

    getPageSize(landscape: boolean, pageType: string): { height: number, width: number }
    {
        return {
            height: landscape ? _.head(pageSizes[pageType]) : _.last(pageSizes[pageType]),
            width: landscape ? _.last(pageSizes[pageType]) : _.head(pageSizes[pageType])
        }
    }

    getDocInfo(title: string): any
    {
        return {
            title: _.toLower(title),
            author: 'kinder m8',
        }
    }

    getDomainName(): string
    {
        return UrlHelper.extractTenantNameFromUrl(location.host);
    }

    getPageHeader(): any
    {
        const name = this._authService.isAdmin() || this._authService.isOwner() ? '' :  this._authService.getClient().name;

        return [
            { text: name, alignment: 'left', margin: [20, 5, 0, 0] },
            { text: DateTimeHelper.now().format(AppConst.dateTimeFormats.longDateFormat), alignment: 'right', margin: [0, 5, 20, 0] },
        ]
    }

    /**
     * generate pdf
     *
     * @param {string} action
     * @param {boolean} landscape
     * @param {string} pageType
     * @param {string} docTitle
     * @param {*} content
     * @param {*} styles
     * @param {string} fileName
     * @returns {Promise<void>}
     */
    generatePDF(action: string, landscape: boolean, pageType: string, docTitle: string, content: any, styles: any, fileName: string): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            setTimeout(() =>
            {
                const docDefinition = {
                    pageSize: pageType,
                    pageMargins: [ 20, 40, 20, 30 ],
                    defaultStyle: {
                        font: 'Quicksand'
                    },
                    info: this.getDocInfo(docTitle),
                    header: (currentPage: number, pageCount: number, page: any) =>
                    {
                        return {
                            columns: [
                                { text: this.getDomainName(), alignment: 'left', margin: [20, 10, 0, 0] },
                                { text: DateTimeHelper.now().format(AppConst.dateTimeFormats.longDateFormat), alignment: 'right', margin: [0, 10, 20, 0] },
                            ]
                        };
                    },
                    footer: (currentPage: number, pageCount: number) =>
                    {
                        return {
                            columns: [
                                { text: 'Page ' + currentPage.toString() + ' of ' + pageCount, alignment: 'left', margin: [20, 0, 0, 0] },
                                { text: '© ' + DateTimeHelper.now().format(AppConst.dateTimeFormats.yearOnly) + '. All Rights Reserved.', alignment: 'right', margin: [0, 0, 20, 0] },
                            ]
                        }
                    },
                    content: content,
                    styles: styles
                };

                //
                if(landscape)
                {
                    docDefinition['pageOrientation'] = 'landscape';
                }

                switch (action)
                {
                    case 'open':
                    pdfMake.createPdf(docDefinition).open();
                    break;

                    case 'print':
                    pdfMake.createPdf(docDefinition).print();
                    break;

                    case 'download':
                    pdfMake.createPdf(docDefinition).download(`${DateTimeHelper.now().unix()}_${fileName}.pdf`);
                    break;

                    case 'blob':
                        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
                            pdfDocGenerator.getBlob((blob) => {
                                this.attachFile = blob
                            })
                        break;

                    default:
                    pdfMake.createPdf(docDefinition).open();
                    break;
                }

                resolve();
            }, 500);
        });
    }

}
