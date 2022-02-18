import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { User } from 'app/main/modules/user/user.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { ChildrenService } from '../../child/services/children.service';
import { ContactReport } from '../contact-reports/model/contact-report.model';
import { RoomService } from '../../room/services/room.service';
import * as jsPDF from 'jspdf'
import 'jspdf-autotable'
import { JsPDFService } from 'app/shared/service/pdf.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SortProp } from 'app/shared/interface/sort';
import { CsvService } from 'app/shared/service/csv.service';
import { AttendanceReport } from '../attendance-reports/model/attendance-report.model';
import { Child } from '../../child/child.model';
import { Room } from '../../room/models/room.model';
import { ReportModel } from '../model/report.model';
import {UrlHelper} from '../../../../utils/url.helper';
import { Bus } from '../../service-settings/bus-list/bus-list.model';



@Injectable()
export class ReportDependencyervice
{
    reportData: ReportModel[];
    private _unsubscribeAll: Subject<any>;
    children: Child[];
    rooms: Room[];
    onChildrenChanged: BehaviorSubject<any>;
    onReportFieldChanged: BehaviorSubject<any>;
    onRoomChanged: BehaviorSubject<any>;
    onBusChanged: BehaviorSubject<any>;


    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _roomService: RoomService,
        private _pdfService: JsPDFService,
        private _csvService: CsvService,
        private _notification: NotificationService,
    ) {
        // Set the defaults
        this._unsubscribeAll = new Subject();
        this.onChildrenChanged = new BehaviorSubject([]);
        this.onReportFieldChanged = new BehaviorSubject([]);
        this.onRoomChanged = new BehaviorSubject([]);
        this.onBusChanged = new BehaviorSubject([]);
    }


    getChildren(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-report`)
                .pipe(
                    map(response =>
                    {
                        this.children = response.data.map((i: any, idx: number) => new Child(i, idx));

                        return {
                            items: this.children
                        };
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.onChildrenChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }

    getAllRooms(getadminonlyrooms : boolean = false): Promise<any>
    {
        const params = new HttpParams().set('getadminonlyrooms', (getadminonlyrooms)? 'true': 'false' );
        return new Promise((resolve, reject) =>
        {
            this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-rooms-report`,{params})
            .pipe(
                map(response =>
                    {
                        this.rooms = response.data.map((i: any, idx: number) => new Room(i, idx));

                        return {
                            items: this.rooms
                        };
                    }),
                    shareReplay()
            )
            .subscribe(
                (response: any) =>
                {
                    this.onRoomChanged.next(response);

                    resolve();
                },
                reject
            );
        });
        
    }

    getAllBusses(): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-bus-list`)
                .pipe(
                    map(response =>
                    {
                        return {
                            items: response.data.map((i: any, idx: number) => new Bus(i, idx))
                        };
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.onBusChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }

    saveField(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/save-selected-field`, data)
            .pipe(
                map(response => 
                {
                    const obje = {
                        type: this.reportData[0].masterType
                    };
                    this.getRepotsData(obje)
                    
                    return response.message;
                }),
                shareReplay()
            );
    }

    getRepotsData(data: object): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-repots-data`,data)
            .pipe(
                map(response =>response.data),
                    shareReplay()
            )
            .subscribe(
                (response: any) => 
                {                    
                    this.reportData = response.map((i, idx) => new ReportModel(i, idx));
                    
                    this.onReportFieldChanged.next([...this.reportData]);

                    resolve();
                },
                reject
            );
        });
        
    }

    addFav(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-fav-report`, { params })
            .pipe(
                map(response => 
                {
                    const obje = {
                        type: this.reportData[0].masterType
                    };
                    this.getRepotsData(obje)
                    
                    return response.message;
                }),
                shareReplay()
            );
    }

    
    deleteReport(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-report`, { params })
            .pipe(
                map(response => 
                {
                    this.reportData = this.reportData.filter((i) => i.id !== index).map((v, i) =>
                    {
                        v.index = i;
                        return v;
                    });

                    setTimeout(() => this.onReportFieldChanged.next([...this.reportData]), 500);

                    return response.message;
                }),
                shareReplay()
            );
    }

    updareReport(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-report-name`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new ReportModel(response.data);
                        
                        const index = this.reportData.findIndex((val) => val.id === item.id);

                        // item.isNew = true;
                        item.index = this.reportData[index].index;

                        this.reportData[index] = item;

                        setTimeout(() => this.onReportFieldChanged.next([...this.reportData]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/children-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            CCSFilters: response.data.ccs_status
                        };
                    }
                }),
                shareReplay()
            );
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

    }


}
