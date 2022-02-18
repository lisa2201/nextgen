import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, finalize, takeUntil } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import 'jspdf-autotable'
import * as _ from 'lodash';

import { AppConst } from 'app/shared/AppConst';
import { User } from 'app/main/modules/user/user.model';
import { JsPDFService } from 'app/shared/service/pdf.service';
import { CsvService } from 'app/shared/service/csv.service';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ImmunisationReportType } from '../immunisation-report/immunisation-report-filter/immunisation-report-filter.component';
import { Child } from '../../child/child.model';
import { Immunisation } from '../../immunisation/model/immunisation.model';
import { ImmunisationTracker } from '../../child/immunisation-tracking/model/immunisation-tracker.model';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ImmunisationMapData, scheduleDataMap } from '../../child/immunisation-tracking/immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';
import { ImmunisationSchedule } from '../../immunisation/model/immunisation-schedule.model';
import { Room } from '../../room/models/room.model';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { CommonService } from 'app/shared/service/common.service';

export interface ImmunisationData {
    id: string;
    name: string;
    desc?: string;
    creator?: any;
    status?: boolean;
    schedule?: scheduleDataMap[],
}

export interface ImmunisationMatrixData {

    immunisationData?: ImmunisationData[],
    child?: Child,
    isAllChecked?: boolean

}

@Injectable()
export class ImmunisationReportservice implements Resolve<any>
{

    private _unsubscribeAll: Subject<any>;
    private userAccounts: User[];
    private children: Child[];
    private immunisationList: Immunisation[];
    private rooms: Room[];

    private immunisationTracker: ImmunisationTracker[];
    private immunisationSchedule: ImmunisationSchedule[];

    immunisationTable: ImmunisationMapData[];
    matrixData: ImmunisationMatrixData[];

    onchildrenChanged: BehaviorSubject<any>;
    onImmunisationListChanged: BehaviorSubject<any>;
    onImmunisationScheduleChanged: BehaviorSubject<any>;
    onRoomChanged: BehaviorSubject<any>;
    onMatrixDataChanged:BehaviorSubject<any>;
    onImmunisationTrackerChanged: BehaviorSubject<any>;

    onReportChanged: BehaviorSubject<any>;
    onTableLoaderChanged: Subject<any>;
    onUserLoaderChanged: Subject<any>;
    totalRecords: number;
    reportType:string = null;
    onDefaultFilterChanged: BehaviorSubject<any>;
    onFilterChanged: Subject<any>;
    filterBy: any | null = null;
    defaultFilter: any = {
        primary_payer: true,
        active_users: true,
    };

    filterData: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _pdfService: JsPDFService,
        private _pdfHelperService: PDFHelperService,
        private _csvService: CsvService,
        private _notification: NotificationService,
        private _commonService: CommonService,
    ) {
        // Set the defaults
        this._unsubscribeAll = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onUserLoaderChanged = new Subject();

        this.onReportChanged = new BehaviorSubject([]);
        this.onchildrenChanged = new BehaviorSubject([]);
        this.onRoomChanged = new BehaviorSubject([]);
        this.onImmunisationTrackerChanged = new BehaviorSubject([]);

        this.onImmunisationListChanged = new BehaviorSubject([]);
        this.onImmunisationScheduleChanged = new BehaviorSubject([]);
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});
        this.filterBy = {...this.defaultFilter};
        this.onMatrixDataChanged = new BehaviorSubject([]);

        this.filterData = null;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {Observable<any> | Promise<any> | any}
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {

        return new Promise<void>((resolve, reject) =>
        {
            Promise.all([
                this.getAllActiveChild(),
                this.getAllImmunisationType(),
                this.getAllImmunisationTracking(),
                this.getAllRooms(),
                this.getAllImmunisationSchedule(),
            ])
            .then(([child, immunisation, immunisationTracker, rooms, schedule]: [any, any, any, any, any]) => 
            {
               
                this.setEvents();

                resolve();
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    // ----------------------------------------------Aged Debtors----------------------------------------------//

    getPeriodTitle(item: string): string {
        
        return AppConst.ImmunisationOption.find(v => (v.value === item)).name;
    }

    getSlotColor(slot: scheduleDataMap): string {
        
        let className: string = '';

        if(slot.tracker){

            // Administered
            className = '#91b993';
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(DateTimeHelper.getUtcDate(slot.trackingDate)), new Date()) < 1) {

            // pastDue
            className = '#f69999';
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(DateTimeHelper.getUtcDate(slot.trackingDate)),new Date()) <= 30) {

            // Nearing Due
            className = '#e6c05e';
        }
        else {
            // others
            className = '#ffffff';
        }

        return className;
        
        
    }
    
    getScheduleMap(schedule: ImmunisationSchedule, child: Child): ImmunisationTracker {

        let singleTracker = null;

            singleTracker = this.immunisationTracker.find(v=> v.schedule.id === schedule.id && v.child.id === child.id)
            
            if(singleTracker && !_.isNull(singleTracker)) {
                
                return singleTracker;
            }

    }
    
    getFormatedDate(date: string) {

        return date? DateTimeHelper.getUtcDate(parseISO(date), 'DD-MM-YYYY'): 'N/A';
    }

    buildTableView(): void
    {

        // reset calendar view
        this.immunisationTable = [];

        setTimeout(() =>
        {
            for(const child of this.children){

                for (const item of this.immunisationList)
                {
                    let sheduleItem :scheduleDataMap[] = [];
                    
                    for(const single of item.schedule) {
    
                        sheduleItem.push({
                            id: single.id,
                            number: single.number,
                            period: single.period,
                            trackingDate: single.getTrackingDate(child),
                            tracker: this.immunisationTracker.length > 0? this.getScheduleMap(single, child) : null
                        })
                    }
    
                    this.immunisationTable.push({
                        id: item.id,
                        name: item.name,
                        desc: item.desc,
                        creator: item.creator,
                        status: item.status,
                        schedule: sheduleItem,
                        child: child
                    })
                }
            }

        },250);
    }


    getPrintMatrixPdf(): void {

        const pageTitle = this.getReportTypes().find(v=>(v.value === AppConst.ImmunisationReportTypes.IMMUNISATION_MATRIX_REPORT)).name;
        const pageType = 'A4';
        let isLandscape = false;
        if (this.matrixData.length < 1) {
            setTimeout(() => {
                this._notification.displayNotification(
                    'Warning',
                    'No data for selected criteria',
                    NotifyMessageType.WARNING,
                    5000
                );
            }, 50);
            setTimeout(() => this.onTableLoaderChanged.next(false), 500);
            return;
        }

        const reportData: Array<any> = [];
        const headings = ['Name',];
        for (const item of this.matrixData[0].immunisationData) {

            headings.push(`${item.name}`);

        }

        const headers = _.map(headings, (val) => {
            return {
                text: val,
                color: '#ffffff',
                fillColor: '#009fe9',
                style: 'head'
            };
        });

        isLandscape = headers.length > 8 ? true: false;

        // push header row 
        reportData.push(headers);

        let rows: Array<any> = [];

        setTimeout(() => {

            for (const childData of this.matrixData) {
                rows = [];
                const name = [{ text: `${childData.child.getShortName()}\n`, fontSize: 10 },
                { text: `${childData.child.age}`, fontSize: 8 }]

                rows.push(
                    { text: name, color: '#212121' }
                );

                for (let item of childData.immunisationData) {

                    let rowData = null;
                    if (item.schedule.length > 0) {
                            
                        rowData = [
                            { text: `${item.schedule[0].number} - ${this.getPeriodTitle(item.schedule[0].period)}\n`, fontSize: 8, color: '#212121', },
                            { text: `${this.getFormatedDate(item.schedule[0].trackingDate)}\n`, fontSize: 6, alignment: 'center', color: '#212121', },
                            { text: `${item.schedule[0].tracker && item.schedule[0].tracker.date ? this.getFormatedDate(item.schedule[0].tracker.date) : (item.schedule[0].tracker && !item.schedule[0].tracker.date) ? 'N/A' : ''}`, fontSize: 6, alignment: 'center', color: '#212121', }
                        ]

                    }
                    else {
                        rowData = ''
                    }
                    rows.push({
                        text: rowData,
                        color: '#212121',
                        fillColor: item.schedule[0] ? this.getSlotColor(item.schedule[0]) : '',
                        style: 'slot'
                    });
                }
                reportData.push(rows);
            }
        }, 50);

        let content = [

            { text:  pageTitle},
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 }] },
            {
                alignment: 'justify',
                columns: [
                    {
                        svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g>
    <g xmlns="http://www.w3.org/2000/svg">
        <g>
            <path d="M256,0C115.39,0,0,115.39,0,256s115.39,256,256,256s256-115.39,256-256S396.61,0,256,0z" fill="#7ec581" data-original="#000000" style="" class=""/>
        </g>
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    </g></svg>`, style: 'svg', width: 12, height: 12, margin: [0, 5, 0, 5]
                    },
                    {
                        width: 80,
                        text: 'Administered', fontSize: 8, margin: [5, 5, 0, 5], color: '#969696'
                    },
                    {
                        svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g>
                <g xmlns="http://www.w3.org/2000/svg">
                    <g>
                        <path d="M256,0C115.39,0,0,115.39,0,256s115.39,256,256,256s256-115.39,256-256S396.61,0,256,0z" fill="#f0c863" data-original="#000000" style="" class=""/>
                    </g>
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                <g xmlns="http://www.w3.org/2000/svg">
                </g>
                </g></svg>`, style: 'svg', width: 12, height: 12, margin: [0, 5, 0, 5]
                    },
                    {
                        width: 70,
                        text: 'Upcoming', fontSize: 8, margin: [5, 5, 0, 5], color: '#969696'
                    },
                    {
                        svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g>
    <g xmlns="http://www.w3.org/2000/svg">
        <g>
            <path d="M256,0C115.39,0,0,115.39,0,256s115.39,256,256,256s256-115.39,256-256S396.61,0,256,0z" fill="#de6e6e" data-original="#000000" style="" class=""/>
        </g>
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    <g xmlns="http://www.w3.org/2000/svg">
    </g>
    </g></svg>`, style: 'svg', width: 12, height: 12, margin: [0, 5, 0, 5]
                    },
                    {
                        width: 60,
                        text: 'Overdue', fontSize: 8, margin: [5, 5, 0, 5], color: '#969696'
                    },
                ]
            },
            {
                table: {
                    widths: _.fill(new Array(headers.length), 'auto'),
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    // widths: _.fill(new Array(headings.length), 'auto'),
                    body: reportData
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                    vLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                    hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                    vLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                },
                style: 'table',
            }
        ];

        const styles = {
            header: {
                fontSize: 18,
                margin: [0, 0, 0, 8],
                alignment: 'center',
            },
            head: {
                fontSize: 10,
                alignment: 'center',
            },
            date: {
                fontSize: 8,
                margin: [0, 8, 0, 0],
                color: '#969696'
            },
            child: {
                fontSize: 8,
                margin: [0, 5, 0, 5],
                color: '#969696'
            },

            table: {
                fontSize: 8,
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 10,
                bold: false,
                margin: [0, 10, 0, 5]
            },
            tick: {
                alignment: 'center',
            },
            slot: {
                // padding: [2, 2, 2, 2]
            }
        };

        setTimeout(() => this.onTableLoaderChanged.next(false),500);
        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }

    geImmunisationMatrixReportData(data: object, pdf?: boolean) {

        this.onTableLoaderChanged.next(true);
        this.filterData = data;

        this.getFormatedDataMatrix(data);

        if(pdf){

            this.getPrintMatrixPdf();
        }
        else{
    
            this.onMatrixDataChanged.next([...this.matrixData])
            setTimeout(() => this.onTableLoaderChanged.next(false),1000);
        }
        
    }

    getFormatedDataMatrix(data: object){
        const selectedSchedule:ImmunisationSchedule = this.immunisationSchedule.find(v=> v.id === data['schedule']);
        const childArray: Array<any> = data['child'];
        const immunisationArray: Array<any> = data['immunisation'];
        this.matrixData = [];
        this.immunisationTable = null;

        for (const childId of childArray) {

            const child: Child = this.children.find(v => (v.id === childId));

            this.immunisationTable = [];

            for (const immunisationId of immunisationArray) {
                const item: Immunisation = this.immunisationList.find(v => (v.id === immunisationId));

                let sheduleItem: scheduleDataMap[] = [];

                for (const single of item.schedule) {

                    if (single.number !== selectedSchedule.number || single.period !== selectedSchedule.period) {
                        continue;
                    }
                    sheduleItem.push({
                        id: single.id,
                        number: single.number,
                        period: single.period,
                        trackingDate: single.getTrackingDate(child),
                        tracker: this.immunisationTracker.length > 0 ? this.getScheduleMap(single, child) : null
                    })
                }

                if (sheduleItem.length < 1) {
                    continue;
                }

                this.immunisationTable.push({
                    id: item.id,
                    name: item.name,
                    desc: item.desc,
                    creator: item.creator,
                    status: item.status,
                    schedule: sheduleItem,
                    child: child
                })
            }

            if (this.immunisationTable.length < 1) {
                continue;
            }
            this.matrixData.push({
                child: child,
                immunisationData: this.immunisationTable,
                isAllChecked: this.immunisationTable.filter(v=> v.schedule[0].tracker !== undefined).length === this.immunisationTable.length ? true : false 
            })
        }
    }

    geImmunisationReportData(data: object, pdf?: boolean) {

        this.onTableLoaderChanged.next(true);

        const childArray: Array<any> = data['child'];
        const immunisationArray: Array<any> = data['immunisation'];
        const roomArray: Array<any> = data['room'] !== null ? data['room'] : [];

        const pageTitle = this.getReportTypes().find(v=>(v.value === data['type'])).name;
        const pageType = 'A4';
        let isLandscape = false;
        let content = [];
        let masterContent = [];
        let firstIteration: boolean = true;
        let isLastIteration: boolean = false;

        for (const childId of childArray) {

            const child: Child = this.children.find(v=>(v.id === childId));
            isLastIteration = childArray.findIndex(v=> v === child.id) == childArray.length - 1 ? true  : false;
            
            this.immunisationTable = [];

                    for (const immunisationId of immunisationArray)
                    {
                        const item: Immunisation = this.immunisationList.find(v=>(v.id === immunisationId));

                        let sheduleItem :scheduleDataMap[] = [];
                        
                        for(const single of item.schedule) {
        
                            sheduleItem.push({
                                id: single.id,
                                number: single.number,
                                period: single.period,
                                trackingDate: single.getTrackingDate(child),
                                tracker: this.immunisationTracker.length > 0? this.getScheduleMap(single, child) : null
                            })
                        }
        
                        this.immunisationTable.push({
                            id: item.id,
                            name: item.name,
                            desc: item.desc,
                            creator: item.creator,
                            status: item.status,
                            schedule: sheduleItem,
                            child: child
                        })
                    }


                content = [];
                const reportData: Array<any> = [];

                const childData = `Full name:  ${child.getFullName()}`;
                const headings = ['Type',];

                let length = 0;
                for (const item of this.immunisationTable) {

                    if (length < item.schedule.length) {

                        length = item.schedule.length;
                    }
                    else {
                        length = length;
                    }

                }
                isLandscape = length <= 6 ? false : true;

                for (let i = 0; i < length; i++) {

                    headings.push(`Schedule ${i + 1}`);
                }

                const headers = _.map(headings, (val) => {
                    return {
                        text: val,
                        color: '#ffffff',
                        fillColor: '#009fe9',
                        style: 'head'
                    };
                });

                // push header row 
                reportData.push(headers);

                for(const data of this.immunisationTable) {

                    const rows: Array<any> = [];

                    const name = [{ text: `${data.name}\n`, fontSize: 10 },
                    { text: `${data.desc}`, fontSize: 8 }]

                    rows.push(
                        { text: name, color: '#212121' }
                    )
                    for (let i = 0; i < length; i++) {

                        let rowData = null;
                        if (data.schedule[i]) {
            
                            rowData = [
                                { text: `${data.schedule[i].number} - ${this.getPeriodTitle(data.schedule[i].period)}\n`, fontSize: 8, color: '#212121',},
                                { text: `${this.getFormatedDate(data.schedule[i].trackingDate)}\n`, fontSize: 6, alignment: 'center', color: '#212121',},
                                { text: `${data.schedule[i].tracker && data.schedule[i].tracker.date ? this.getFormatedDate(data.schedule[i].tracker.date) : (data.schedule[i].tracker && !data.schedule[i].tracker.date) ? 'N/A' : ''}`, fontSize: 6, alignment: 'center',color: '#212121', }
                            ]

                        }
                        else {
                            rowData = ''
                        }
                        rows.push({
                            text: rowData,
                            color: '#212121',
                            fillColor: data.schedule[i] ? this.getSlotColor(data.schedule[i]) : '',
                            style: 'slot'
                        });
                    }

                    reportData.push(rows);

                }


                content = [

                    { text: firstIteration? pageTitle : '', style: 'header' },
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 }] },
                    { text: childData, style: 'child' },
                    {
                        alignment: 'justify',
                        columns: [
                            {
                                width: 250,
                                text: `Age: ${child.age} || Date of birth: ${child.dob}`, style: 'child'
                            },
                            {
                                svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g>
            <g xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path d="M256,0C115.39,0,0,115.39,0,256s115.39,256,256,256s256-115.39,256-256S396.61,0,256,0z" fill="#7ec581" data-original="#000000" style="" class=""/>
                </g>
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            </g></svg>`, style: 'svg', width: 12, height: 12, margin: [0, 5, 0, 5]
                            },
                            {
                                width: 80,
                                text: 'Administered', fontSize: 8, margin: [5, 5, 0, 5], color: '#969696'
                            },
                            {
                                svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g>
                        <g xmlns="http://www.w3.org/2000/svg">
                            <g>
                                <path d="M256,0C115.39,0,0,115.39,0,256s115.39,256,256,256s256-115.39,256-256S396.61,0,256,0z" fill="#f0c863" data-original="#000000" style="" class=""/>
                            </g>
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        <g xmlns="http://www.w3.org/2000/svg">
                        </g>
                        </g></svg>`, style: 'svg', width: 12, height: 12, margin: [0, 5, 0, 5]
                            },
                            {
                                width: 70,
                                text: 'Upcoming', fontSize: 8, margin: [5, 5, 0, 5], color: '#969696'
                            },
                            {
                                svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g>
            <g xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path d="M256,0C115.39,0,0,115.39,0,256s115.39,256,256,256s256-115.39,256-256S396.61,0,256,0z" fill="#de6e6e" data-original="#000000" style="" class=""/>
                </g>
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            <g xmlns="http://www.w3.org/2000/svg">
            </g>
            </g></svg>`, style: 'svg', width: 12, height: 12, margin: [0, 5, 0, 5]
                            },
                            {
                                width: 60,
                                text: 'Overdue', fontSize: 8, margin: [5, 5, 0, 5], color: '#969696'
                            },
                        ]
                    },
                    {
                        table: {
                            widths: _.fill(new Array(headers.length), 'auto'),
                            headerRows: 1,
                            keepWithHeaderRows: true,
                            dontBreakRows: true,
                            // widths: _.fill(new Array(headings.length), 'auto'),
                            body: reportData
                        },
                        layout: {
                            defaultBorders: false,
                            paddingLeft: (i, node) => 4,
                            paddingRight: (i, node) => 4,
                            paddingTop: (i, node) => 4,
                            paddingBottom: (i, node) => 4,
                            hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                            vLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                            hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                            vLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                        },
                        style: 'table',
                        pageBreak: isLastIteration ? '' : 'after',
                    }
                ];
                firstIteration = false;
                masterContent.push(content);
            
        }
        const styles = {
            header: {
                fontSize: 18,
                margin: [0, 0, 0, 8],
                alignment: 'center',
            },
            head: {
                fontSize: 10,
                alignment: 'center',
            },
            date: {
                fontSize: 8,
                margin: [0, 8, 0, 0],
                color: '#969696'
            },
            child: {
                fontSize: 8,
                margin: [0, 5, 0, 5],
                color: '#969696'
            },

            table: {
                fontSize: 8,
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 10,
                bold: false,
                margin: [0, 10, 0, 5]
            },
            tick: {
                alignment: 'center',
            },
            slot: {
                // padding: [2, 2, 2, 2]
            }
        };

        setTimeout(() => this.onTableLoaderChanged.next(false),500);
        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, masterContent, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });



    }

    getReportTypes(): ImmunisationReportType[] {
        return [
            {
                name: 'Child Immunisation Record',
                value: AppConst.ImmunisationReportTypes.IMMUNISATION_REPORT
            },
            {
                name: 'Child Immunisation Matrix',
                value: AppConst.ImmunisationReportTypes.IMMUNISATION_MATRIX_REPORT
            }
        ];
    }

    // for immunisation reminders
    getAllActiveChild(): Promise<any> {
        return new Promise((resolve, reject) => {
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children`, {})
                .pipe(
                    map(response => {

                        this.children = response.data.map((i: any, idx: number) => new Child(i, idx));
                        this.onchildrenChanged.next([...this.children]);
                        return this.children;
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
        });
    }

    getAllImmunisationType(): Promise<any> {
        return new Promise((resolve, reject) => {
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-immunisation`, {})
                .pipe(
                    map(response => {
                        this.immunisationList = response.data.map((i: any, idx: number) => new Immunisation(i, idx));
                        this.onImmunisationListChanged.next([...this.immunisationList]);
                        return this.immunisationList;
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
        });
    }

    getAllImmunisationTracking(): Promise<any> {
        return new Promise((resolve, reject) => {
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-all-immunisation-tracker`, {})
                .pipe(
                    map(response => {
                        this.immunisationTracker = response.data.map((i: any, idx: number) => new ImmunisationTracker(i, idx))
                        this.onImmunisationTrackerChanged.next([...this.immunisationTracker]);
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
        });
    }

    getAllImmunisationSchedule(): Promise<any> {
        return new Promise((resolve, reject) => {
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-all-immunisation-schedule`, {})
                .pipe(
                    map(response => {

                        this.immunisationSchedule = response.data.map((i: any, idx: number) => new ImmunisationSchedule(i, idx));
                        this.onImmunisationScheduleChanged.next([...this.immunisationSchedule]);

                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
        });
    }

    getAllRooms(getadminonlyrooms: boolean = false): Promise<any> {
        const params = new HttpParams().set('getadminonlyrooms', (getadminonlyrooms) ? 'true' : 'false');
        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-rooms-report`, { params })
                .pipe(
                    map(response => {
                        this.rooms = response.data.map((i: any, idx: number) => new Room(i, idx));
                        this.onRoomChanged.next([...this.rooms]);
                        return this.rooms;
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
        });

    }

    setEvents(): void {

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;
            });

            this.buildTableView();
    }

    /**
     * Unsubscribe options
     */
    unsubscribeOptions(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();
        this.filterBy = {...this.defaultFilter};
        this.matrixData = []
        this.onMatrixDataChanged.next([...this.matrixData])

        this.onReportChanged.next([]);
        this.totalRecords = 0;
    }

    createTracking(data: object): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-single-immunisation-tracker`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {

                        this.getAllImmunisationTracking();

                        setTimeout(() => {

                            this.geImmunisationMatrixReportData(this.filterData, false);
                            this._commonService.getReminders();

                        },2000);
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                shareReplay()
            );
    }

    updateTracking(data: object): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-single-immunisation-tracker`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        
                        this.getAllImmunisationTracking();
                        setTimeout(() => {

                            this.geImmunisationMatrixReportData(this.filterData, false);

                        },2000);
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                shareReplay()
            );
    }


    bulkUpdateByChild(data: object): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/bulk-update-immunisation-tracker-by-child`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.immunisationTracker = response.data.map((i: any, idx: number) => new ImmunisationTracker(i, idx))
                        this.onImmunisationTrackerChanged.next([...this.immunisationTracker]);
                        setTimeout(() => {

                            this.geImmunisationMatrixReportData(this.filterData, false);

                        },1000);
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                shareReplay()
            );
    }

    bulkUpdate(): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        const data = {
            data: this.matrixData
        };
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/bulk-update-immunisation-tracker`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.immunisationTracker = response.data.map((i: any, idx: number) => new ImmunisationTracker(i, idx))
                        this.onImmunisationTrackerChanged.next([...this.immunisationTracker]);
                        setTimeout(() => {

                            this.geImmunisationMatrixReportData(this.filterData, false);

                        },1000);
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                shareReplay()
            );
    }

    bulkDeleteByChild(data: object): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/bulk-delete-immunisation-tracker-by-child`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.immunisationTracker = response.data.map((i: any, idx: number) => new ImmunisationTracker(i, idx))
                        this.onImmunisationTrackerChanged.next([...this.immunisationTracker]);
                        setTimeout(() => {

                            this.geImmunisationMatrixReportData(this.filterData, false);

                        },1000);
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                shareReplay()
            );
    }

    deleteTracker(index: string): Observable<any>
    {
        let params = new HttpParams()
            .set('id', index);
        this.onTableLoaderChanged.next(true);
        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-immunisation-tracker`, {params})
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.immunisationTracker = this.immunisationTracker.filter((i) => i.id !== index).map((v, i) =>
                        {
                            v.index = i;
                            return v;
                        });
                        // this.immunisationTracker = response.data.map((i: any, idx: number) => new ImmunisationTracker(i, idx))
                        this.onImmunisationTrackerChanged.next([...this.immunisationTracker]);
                        setTimeout(() => {

                            this.geImmunisationMatrixReportData(this.filterData, false);

                        },1000);
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                shareReplay()
            );
    }

}
