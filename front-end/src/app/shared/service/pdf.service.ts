import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { AppConst } from '../AppConst';
import * as jsPDF from 'jspdf'
import 'jspdf-autotable'
import { NotifyType } from '../enum/notify-type.enum';
import { NotificationService } from './notification.service';
import { PDFHelperService } from './pdf-helper.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { stat } from 'fs';
import { AttendanceReport } from 'app/main/modules/report/attendance-reports/model/attendance-report.model';

@Injectable({
    providedIn: 'root'
})
export class JsPDFService {

    ignoreLoadingHeaders: HttpHeaders;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {HttpClient} _httpClient
     */
    constructor(
        private _logger: NGXLogger,
        private _httpClient: HttpClient,
        private _notification: NotificationService,
        private _pdfService: PDFHelperService,
    )
    {
        // Set defaults
        this.ignoreLoadingHeaders = new HttpHeaders({ 'ignoreProgressBar': '' });
    }


    downLoadPdf(field: any, report:any,  heading: any, theme: string):void{
        try
        {
            const columns = [];
            // tslint:disable-next-line: prefer-for-of
            for (let k = 0 ; k < field.length; k++) {
                columns.push(field[k]['name']);
            };
    
            // this._logger.debug('[columns]', columns);
            
            const masterRows = [];
            // tslint:disable-next-line: prefer-for-of
            for (let k = 0 ; k < report.length; k++) {
                const rows = [];
                // tslint:disable-next-line: prefer-for-of
                for (let i = 0 ; i < field.length; i++) {
                    rows.push(report[k][field[i]['res']] ? report[k][field[i]['res']] : 'N/A' );
                };
                // this._logger.debug('[rowsssss]', rows);
    
                masterRows.push(rows);
            };
    
    
            // tslint:disable-next-line: only-arrow-functions
            const pageContent = function (data) {
                /* Header */
                if (data.pageCount === 1) {
                    doc.setFontSize(10);
    
                    /* Footer */
                    // doc.text('Hi How are you', 40, 250, 'center');
                    const str = 'Page' + data.pageCount;
                    doc.setFontSize(10);
                    doc.text(str, 280, doc.internal.pageSize.height - 10, 'center');
    
                    doc.setFontSize(8);
                    doc.text(datetime, 570, 36, null, null, 'right');
                    // doc.text('And some more', 200, 10, null, null, 'right');
                    doc.setFontSize(15);
                    doc.text(heading, data.settings.margin.left, 36);
                }
                else {
                    const str = 'Page ' + data.pageCount;
                    doc.setFontSize(10);
                    doc.text(str, 280, doc.internal.pageSize.height -5);
                }
    
            };
            const currentdate = new Date();
            const datetime = currentdate.getDate() + '/' + (currentdate.getMonth() + 1) + '/' + currentdate.getFullYear();
            // this._logger.debug('[masterRows]', masterRows);
                
            const doc = new jsPDF('1','pt', 'a4');
            doc.autoTable(columns, masterRows,{
                addPageContent: pageContent,
                theme: theme,
                startY: 63,
                margin: {horizontal: 20},
                styles: {overflow: 'linebreak', columnWidth: 'auto'},
                columnStyles: {0: {columnWidth: '15%'}}
            });
            // doc.setFillColor(118,41,12)
            doc.rect(16, 16, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 40, 'S');
            doc.save(heading+datetime+'.pdf');
            // doc.output('dataurlnewwindow');
    
        }
        catch (err)
        {
            setTimeout(() => this._notification.displaySnackBar('error while building report', NotifyType.ERROR), 200);
            return;
        }
        
    }

    // getPreviewLabel(): { start :string, end: string }
    // {
    //     let start = null;
    //     let end = null;

    //     switch (this.fc.type.value) 
    //     {
    //         case '0':
    //             start = DateTimeHelper.getUtcDate(this.fc.date.value);
    //             break;

    //         case '1':
    //             start = DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD');
    //             end = DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD');
    //             break;
        
    //         default:
    //             start = DateTimeHelper.getUtcDate(_.head(this.fc.range.value));
    //             end = DateTimeHelper.getUtcDate(_.last(this.fc.range.value));
    //             break;
    //     }

    //     return {
    //         start: start,
    //         end: end
    //     }
    // }

    print(option: string = 'open', field:any, contentBody:any,  heading:any, dateRange:any): void
    {
        const pageTitle = heading;
        const pageType = 'A4';
        const isLandscape = field.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: dateRange, style: 'date' },
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(field.length), 'auto'),
                    body: contentBody
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 8,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 8,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 8,
                margin: [0, 10, 0, 0]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            }
        }


        this._pdfService
            .generatePDF(option, isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }


}
