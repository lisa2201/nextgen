import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';

import { ChildrenService } from '../../services/children.service';

import { Child } from '../../child.model';
import { AppConst } from 'app/shared/AppConst';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { ImmunisationTracker } from '../model/immunisation-tracker.model';
import { CommonService } from 'app/shared/service/common.service';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { ImmunisationMapData, scheduleDataMap } from '../immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';
import { differenceInCalendarDays, parseISO } from 'date-fns';

@Injectable()
export class ImmunisationTrackingService
{
    private _unsubscribeAll: Subject<any>;

    private child: Child;
    private immunisation: Immunisation[];
    private immunisationTracker: ImmunisationTracker[];

    onChildChanged: BehaviorSubject<any>;
    onChildImmunisationChanged: BehaviorSubject<any>;
    onChildImmunisationTrackerChanged: BehaviorSubject<any>;
    onFilterRoomChanged: BehaviorSubject<any>;

    onTableChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onUpdateCalendarDateChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    routeParams: any;

    dateParams: any | null = null;
    filterBy: any | null = null;

    calenderSettings = {
        hideWeekEnd: false
    };

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildrenService} _childrenService
     * @param {NotificationService} _notificationService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _childrenService: ChildrenService,
        private _notificationService: NotificationService,
        private _commonService: CommonService,
        private _pdfHelperService: PDFHelperService,
    )
    {
        // Set the defaults
        this.onChildChanged = new BehaviorSubject([]);
        this.onChildImmunisationChanged = new BehaviorSubject([]);
        this.onChildImmunisationTrackerChanged = new BehaviorSubject([]);
        this.onFilterRoomChanged = new BehaviorSubject([]);
        this.onTableChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onUpdateCalendarDateChanged = new Subject();
        this.onFilterChanged = new Subject();


        this._unsubscribeAll = new Subject();
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
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any
    {
        this.routeParams = route.params;

        return new Promise<void>((resolve, reject) =>
        {
            Promise.all([
                this.getChild(this.routeParams.id),
                this.getImmunisation(this.routeParams.id),
                this.getImmunisationTracker(this.routeParams.id)
            ])
            .then(([child, immunisation, immunisationTracker]: [any, any, any]) => 
            {
                if(this.immunisation.length === 0){
                    setTimeout(() => this._notificationService.displaySnackBar('No Immunisation Found', NotifyType.WARNING), 200);
                    reject();
                }
                this.setEvents();

                resolve();
            })
            .catch(errorResponse => 
            {
                if (browserRefresh && state.url !== '')
                {
                    if (errorResponse && errorResponse.error)
                    {
                        this._notificationService.displaySnackBar(errorResponse.error.message, NotifyType.ERROR);
                    }

                    this._router.navigate([_.head(_.filter(state.url.split('/'), _.size))]);
                }

                reject(errorResponse);
            });
        });
    }

    /**
     * set events after resolve
     */
    setEvents(dependencies: any = null): void
    {
        if (!_.isEmpty(dependencies))
        {

            this.onFilterRoomChanged.next(dependencies.rooms);

        }

        this.onTableChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                // this.getImmunisationTracker(this.child.id);
                this.getImmunisation(this.child.id);
                
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                this.getImmunisation(this.child.id);
            });
    }


    getImmunisation(child: string): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            // set view loader
            this.onViewLoaderChanged.next(true);

            const params = new HttpParams()
                .set('id', child)
                .set('filters', JSON.stringify(this.filterBy));
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-immunisation`, {})
                .pipe(
                    map(response => response.data),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.immunisation = response.map((i: any, idx: number) => new Immunisation(i, idx));
                        this.onChildImmunisationChanged.next([...this.immunisation]);
                        resolve();
                    },
                    reject
                );
        });
    }

    getImmunisationTracker(id: string): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            // set view loader
            this.onViewLoaderChanged.next(true);
            const params = new HttpParams()
                .set('id', id);
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-immunisation-tracker`, {params})
                .pipe(
                    map(response => response.data),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        // console.log('tracker in service', response);
                        
                        this.immunisationTracker = response.map((i: any, idx: number) => new ImmunisationTracker(i, idx));
                        this.onChildImmunisationTrackerChanged.next([...this.immunisationTracker]);
                        resolve();
                    },
                    reject
                );
        });
    }
    /**
     * Get child item
     * 
     * @returns {Promise<any>}
     */
    getChild(index: string): Promise<void>
    {
        return new Promise((resolve, reject) => 
        {
            this._childrenService
                .getChild(index)
                .pipe(first())
                .subscribe(
                    (response) =>
                    {
                        this.child = response;

                        this.onChildChanged.next(this.child);
                        
                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * Create single booking
     * 
     * @returns {Observable<any>}
     */
    createTracking(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-single-immunisation-tracker`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new ImmunisationTracker(response.data);
                        item.isNew = true;

                        if(this.immunisationTracker)
                        {
                            this.immunisationTracker = this.immunisationTracker.concat(item).map((v, i) =>
                            {
                                v.index = i;
                                return v;
                            });
                        }

                        this.onChildImmunisationTrackerChanged.next([...this.immunisationTracker]);

                        // call re-count of children without immunisation
                        this._commonService.getReminders();
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
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-single-immunisation-tracker`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        
                        if(this.immunisationTracker)
                        {
                            const item = new ImmunisationTracker(response.data);
                            item.isNew = true;

                            const index = this.immunisationTracker.findIndex((val) => val.id === item.id);
                            item.index = this.immunisationTracker[index].index;

                            this.immunisationTracker[index] = item;
                        }

                        this.onChildImmunisationTrackerChanged.next([...this.immunisationTracker]);
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
                        this.onChildImmunisationTrackerChanged.next([...this.immunisationTracker]);
                        setTimeout(() => {

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
    
    updateTrackingValue(data: object): Observable<any>
    {
        
        this.onViewLoaderChanged.next(true);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-tracking-value`,data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.child = new Child(response.data);
                        this.onChildChanged.next(this.child);
                        // call re-count of children without immunisation
                        this._commonService.getReminders();
                        return response.message
                    }
                    else
                    {
                        return response.message;
                    }
                }),
                finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    getPeriodTitle(item: string): string {
        
        return AppConst.ImmunisationOption.find(v => (v.value === item)).name;
    }

    getSlotColor(slot: scheduleDataMap): string {
        
        let className: string = '';

        if(slot.tracker){

            // Administered
            className = '#91b993';
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(slot.trackingDate), new Date()) < 1) {

            // pastDue
            className = '#f69999';
        }
        else if(!slot.tracker && differenceInCalendarDays(parseISO(slot.trackingDate),new Date()) <= 30) {

            // Nearing Due
            className = '#e6c05e';
        }
        else {
            // others
            className = '#ffffff';
        }

        return className;
        
        
    }

    getFormatedDate(date: string) {

        return date? DateTimeHelper.getUtcDate(parseISO(date), 'DD-MM-YYYY'): 'N/A';
    }

    getReportPdf(immunisationData: ImmunisationMapData[]): any {

        // set view loader
        this.onViewLoaderChanged.next(true);
        
        const reportData: Array<any> = [];

        const date = `Immunisation Report ${DateTimeHelper.getUtcDate(new Date())}`;
        const child = `Full name:  ${this.child.getFullName()}`;

        const headings = ['Type',];

        let length = 0;
        for (const immunisation of immunisationData) {
            
            if(length < immunisation.schedule.length){

                length = immunisation.schedule.length;
            }
            else{
                length = length;
            }
            
        }


        for(let i = 0; i < length; i++){
            headings.push(`schedule ${i+1}`);
        }
        

        const headers = _.map(headings, (val) => {
            return {
                text: val,
                color: '#ffffff',
                fillColor: '#009fe9',
                style: 'head'
            };
        });


        reportData.push( headers);

        _.forEach(immunisationData, (data) => {

            const rows: Array<any> = [];

            const name = [{text: `${data.name}\n`, fontSize: 10},
                        {text: `${data.desc}`, fontSize: 8}]
            
            rows.push(
                {text: name, color: '#212121'}
            )
            for(let i = 0; i < length; i++){
                let rowData = null;
                if(data.schedule[i]){

                    // rowData  = `${data.schedule[i].number} - ${this.getPeriodTitle(data.schedule[i].period)}\n`;

                    rowData = [
                        { text: `${data.schedule[i].number} - ${this.getPeriodTitle(data.schedule[i].period)}\n` },
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 50, y2: 0, lineWidth: 1 }] },
                        { text: `${this.getFormatedDate(data.schedule[i].trackingDate)}\n`, fontSize: 6, alignment: 'center', },
                        { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512"><g id="Calendar"><path d="M57,8H52V6a4,4,0,0,0-8,0V8H36V6a4,4,0,0,0-8,0V8H20V6a4,4,0,0,0-8,0V8H7a5,5,0,0,0-5,5V53a5,5,0,0,0,5,5H35a1,1,0,0,0,0-2H7a3.009,3.009,0,0,1-3-3V22H60V39a1,1,0,0,0,2,0V13A5,5,0,0,0,57,8ZM46,6a2,2,0,0,1,4,0v6a2,2,0,0,1-4,0ZM30,6a2,2,0,0,1,4,0v6a2,2,0,0,1-4,0ZM14,6a2,2,0,0,1,4,0v6a2,2,0,0,1-4,0ZM60,20H4V13a3.009,3.009,0,0,1,3-3h5v2a4,4,0,0,0,8,0V10h8v2a4,4,0,0,0,8,0V10h8v2a4,4,0,0,0,8,0V10h5a3.009,3.009,0,0,1,3,3Z"/><path d="M30,29a2,2,0,0,0-2-2H24a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2Zm-6,3V29h4v3Z"/><path d="M18,29a2,2,0,0,0-2-2H12a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2Zm-6,3V29h4v3Z"/><path d="M52,34a2,2,0,0,0,2-2V29a2,2,0,0,0-2-2H48a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2Zm-4-5h4v3H48Z"/><path d="M30,38a2,2,0,0,0-2-2H24a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2Zm-6,3V38h4v3Z"/><path d="M18,38a2,2,0,0,0-2-2H12a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2Zm-6,3V38h4v3Z"/><path d="M28,45H24a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2V47A2,2,0,0,0,28,45Zm-4,5V47h4v3Z"/><path d="M36,34h4a2,2,0,0,0,2-2V29a2,2,0,0,0-2-2H36a2,2,0,0,0-2,2v3A2,2,0,0,0,36,34Zm0-5h4v3H36Z"/><path d="M34,41a2,2,0,0,0,2,2,1,1,0,0,0,0-2V38h4a1,1,0,0,0,0-2H36a2,2,0,0,0-2,2Z"/><path d="M16,45H12a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2V47A2,2,0,0,0,16,45Zm-4,5V47h4v3Z"/><path d="M49,36A13,13,0,1,0,62,49,13.015,13.015,0,0,0,49,36Zm0,24A11,11,0,1,1,60,49,11.013,11.013,0,0,1,49,60Z"/><path d="M54.778,44.808,47,52.586,43.465,49.05a1,1,0,0,0-1.414,1.414l4.242,4.243a1,1,0,0,0,1.414,0l8.485-8.485a1,1,0,0,0-1.414-1.414Z"/></g></svg>`, width: 10, height: 10 },
                        { text: `${data.schedule[i].tracker && data.schedule[i].tracker.date ? this.getFormatedDate(data.schedule[i].tracker.date) : (data.schedule[i].tracker && !data.schedule[i].tracker.date) ? 'N/A' : ''}`, fontSize: 6, alignment: 'center', }
                    ]
                        
                }
                else{
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

        });
        
        const pageTitle = 'Immunisation Report';
        const pageType = 'A4';
        const isLandscape = length <= 7?  false : true;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 }] },
            { text: child, style: 'child' },
            {
                alignment: 'justify',
                columns: [
                    { 
                        width: 250,
                        text: `Age: ${this.child.age} || Date of birth: ${this.child.dob}`, style: 'child' 
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
            </g></svg>`,style: 'svg',  width: 12,height: 12,  margin: [0, 5, 0, 5]
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
                        </g></svg>`, style: 'svg',  width: 12,height: 12, margin: [0, 5, 0, 5]
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
            </g></svg>`, style: 'svg',  width: 12,height: 12, margin: [0, 5, 0, 5]
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
                style: 'table'
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
            slot:{
                // padding: [2, 2, 2, 2]
            }
        };


        setTimeout(() => this.onViewLoaderChanged.next(false), 500),
        
        

        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });
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

        // reset all variables
        
        this.dateParams = null;
        this.filterBy = null;
    }
}
