import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { StaffIncident } from '../staff-incident.model';
import { User } from 'app/main/modules/user/user.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Resolve } from '@angular/router';
import { takeUntil, map, shareReplay, finalize } from 'rxjs/operators';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { AppConst } from 'app/shared/AppConst';
import { ConvertNumberToTimeStringPipe } from 'app/shared/pipes/convert-number-to-12-hours.pipe';
import { CommonService } from 'app/shared/service/common.service';
import * as _ from 'lodash';
import { truncate } from 'fs';

@Injectable()
export class StaffIncidentService implements Resolve<any> {

    onIncidentsChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;

    private _unsubscribeAll: Subject<any>;

    private incidents: StaffIncident[];
    private recordedPerson: User| undefined;
    private witness: User;
    private supervisor: User;
    
    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [8, 16, 20];
    sectiondata:any = [];
    headerdata:any = [];

    totalItems = 0;
    pagination: any | null = null;
    filterBy: any = '0';
    searchText: string | null = null;
    totalRecords = 0;
    totalDisplayRecords = 0;
    isFiltered = false;

    routeParams: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param _pdfHelperService
     * @param _timeConvert
     * @param {CommonService} _commonService
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _pdfHelperService: PDFHelperService,
        private _timeConvert : ConvertNumberToTimeStringPipe,
        private _commonService: CommonService,
        private _logger: NGXLogger
    ) {
        // Set the defaults
        this.onIncidentsChanged = new BehaviorSubject([]);
     
        this.onSearchTextChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();

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

     resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {
            Promise.all([
                this.getIncidents()
            ])
            .then(([incidents]: [any]) => {
                this.onSearchTextChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(searchText => {
                        this.searchText = searchText;
                        this.getIncidents();
                    });

                this.onFilterChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(filter => {
                        this.filterBy = filter;
                        if (!_.isNull(this.pagination)) {
                            this.pagination.page = this.defaultPageIndex;
                        }

                        this.getIncidents();
                    });

                this.onPaginationChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(pagination => {
                        this.pagination = pagination;
                        this.getIncidents();
                    });

                resolve(null);
            })
            .catch(error => {
                reject(error);
            });
        });
    
    }

    /**
     * get User dependency
     *
     * @returns {Observable<any>}
     */
    getUsers(own_room: string): Observable<any> {

        const params = new HttpParams()
            .set('own_room', own_room);
         
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/staff-list`, {params})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length < 1) {
                        return {};
                    }
                    else {
                        return response.data.map((i: any, idx: number) => new User(i, idx));
                    }
                })
            );
    }
    
    /**
     * get incidents
     *
     * @returns {Promise<any>}
     */
    getIncidents(): Promise<any> {
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

            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-staff-incidents`, { params })
                .pipe(
                    map(response => {
                        this.incidents = response.data.map(i => new StaffIncident(i));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;
                        
                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : this.incidents,
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),

                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        // this.incidents=response.data.map(i => new Room(i));
                        this.onIncidentsChanged.next(response);
                        resolve(null);
                    },
                    reject
                );
        });
    }

    getIncident(index: string): Observable<any>
    {
        const params = new HttpParams()
            .set('id', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-incident`, { params })
            .pipe(
                map(response => new StaffIncident(response.data)),
                shareReplay()
            );
    }

    /**
     * cerate new incident
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    storeIncidnt(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/store-staff-incident`, data)
            .pipe(
                map(response => {
                    this.getIncidents();
                    return response.message;
                })
            );
    }

    /**
     * update incident
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateIncident(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-staff-incident`, data)
            .pipe(
                map(response => {
                    this.getIncidents();

                    return response.message;
                })
            );
    }

    /**
     * Delete a incident
     * 
      * @returns {Observable<any>}
    */
    delete(index: string): Observable<any> {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-incident`, { params })
            .pipe(
                map(response => {
                    this.getIncidents();
                    return response.message;
                })
            );
    }

    /**
    * Get room item
    * 
    * @returns {Observable<any>}
    */
    async printReport(incident: StaffIncident, staff: User[]) {

        this.recordedPerson = staff.filter(x => x.id == incident.recordedPerson)[0];
        this.witness = staff.filter(x => x.id == incident.witnessPerson)[0];
        this.supervisor = staff.filter(x => x.id == incident.supervisor)[0];
  
        setTimeout(async () => {
            const content = [];
            content.push({ text: 'Staff Incident Form' , style: 'mainHeader' });
            
            this.headerdata = [{text: 'Details', colSpan: 1}];
            this.sectiondata.push(['Full name of team member: '+incident.staff.firstName+ ' '+incident.staff.lastName]);
            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));
            this.sectiondata = [];
            this.sectiondata.push(['Date of birth: '+incident.staff.dob, 'Age: 0']);
            this.sectiondata.push(['Date of incident/injury: ', incident.date]);
            this.sectiondata.push(['Time of incident/injury: ', this._timeConvert.transform(incident.time, '12h')]);
            content.push(this.getTableContent('', this.sectiondata, 'tableattached'));

            this.headerdata = [{text: 'Details of person completing form', colSpan: 2}, ''];
            this.sectiondata = [];
            this.sectiondata.push(['Name: ', ((this.recordedPerson)?(this.recordedPerson.firstName+ ' '+this.recordedPerson.lastName):'')]);
            this.sectiondata.push(['Signature: ', {image: incident.recordedPersonSignature, width: 200}]);
            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));
            this.sectiondata = [];
            this.sectiondata.push(['Position: Admin ']);
            content.push(this.getTableContent('', this.sectiondata, 'tableattached'));
            this.sectiondata = [];
            this.sectiondata.push(['Date Record was completed: ', incident.recordedDate]);
            this.sectiondata.push(['Time Record was completed:  ', (incident.recordedTime)?this._timeConvert.transform(incident.recordedTime, '12h'):'']);
            content.push(this.getTableContent('', this.sectiondata, 'tableattached'));

            this.headerdata = [{text: 'Details of witness', colSpan: 2}, ''];
            this.sectiondata = [];
            this.sectiondata.push(['Name of Witness: ', ((this.witness)?(this.witness.firstName+ ' '+this.witness.lastName):'')]);
            this.sectiondata.push(['Signature of Witness: ', {image: incident.witnessSignature, width: 200}]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            content.push({ text: 'Incient/Injury details', class: 'subheading'});

            this.headerdata = [{text: 'Circumstances leading to the Incident/Injury'}];
            this.sectiondata = [];
            this.sectiondata.push([incident.incidentCircumstances]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            this.headerdata = [{text: 'Equipment/Resources involved'}];
            this.sectiondata = [];
            this.sectiondata.push([incident.incidentEquipments]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            this.headerdata = [{text: 'Location'}];
            this.sectiondata = [];
            this.sectiondata.push([incident.incidentLocation]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            this.headerdata = [{text: 'Action taken (Including first aid etc)'}];
            this.sectiondata = [];
            this.sectiondata.push([incident.incidentActionTaken]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            this.headerdata = [{text: 'Notifications (Including attempted notifications))', colSpan: 4}, '','',''];
            this.sectiondata = [];
            this.sectiondata.push(['Contact', 'Full Name', 'Time & Date', 'Successfully Contacted']);
            this.sectiondata.push(['Parent/Guardian', incident.notificationParent, incident.notificationParentDate+' '+((incident.notificationParentTime)? this._timeConvert.transform(incident.notificationParentTime, '12h') : ''),  incident.notificationParentContacted]);
            this.sectiondata.push(['Supervisor', incident.notificationSupervisor, incident.notificationSupervisorDate+' '+((incident.notificationSupervisorTime)? this._timeConvert.transform(incident.notificationSupervisorTime, '12h') : ''),  incident.notificationSupervisorContacted]);
            this.sectiondata.push(['Regulatory Authority Officer (if applicable)', incident.notificationOfficer, incident.notificationOfficerDate+' '+((incident.notificationOfficerTime)? this._timeConvert.transform(incident.notificationOfficerTime, '12h') : ''),  incident.notificationOfficerContacted]);
            this.sectiondata.push(['Parent/Guardian', incident.notificationMedical, incident.notificationMedicalDate+' '+((incident.notificationMedicalTime)? this._timeConvert.transform(incident.notificationMedicalTime, '12h') : ''),  incident.notificationMedicalContacted]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            this.headerdata = ['',''];
            this.sectiondata = [];
            this.sectiondata.push(['Was the team member transported by ambulance?', incident.transportedByAmbulance]);
            this.sectiondata.push(['Does the incident/injury require the team member to be excluded from shifts?', incident.excludedFromshifts]);
            this.sectiondata.push(['Does the incident/injury require notification to the Health Department or other recognised authorities?', incident.notifiedToAuthorities]);
            content.push(this.getTableContent('', this.sectiondata, ''));
            this.sectiondata = [];
            this.sectiondata.push(['Recommended leave period: '+incident.recommendedLeave]);
            content.push(this.getTableContent('', this.sectiondata, 'tableattached'));

            this.headerdata = [{text: 'Follow-up requirments', colSpan: 2}, ''];
            this.sectiondata = [];
            this.sectiondata.push(['Has a medical certificate been provided?', incident.medicalCertificateProvided]);
            this.sectiondata.push(['Has the medical certificate been submitted into the team members file?', incident.medicalCertificateSubmitted]);

            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));

            this.headerdata = [{text: 'Supervisors Acknowledgement and comments', colSpan: 2}, ''];
            this.sectiondata = [];
            this.sectiondata.push(['Name', ((this.supervisor)?(this.supervisor.firstName+ ' '+this.supervisor.lastName):'')]);

            this.sectiondata.push(['Signatue', {image: incident.supervisorSignature, width: 200}]);
            this.sectiondata.push(['Date', incident.supervisedDate]);
            content.push(this.getTableContent(this.headerdata, this.sectiondata, ''));    
            this.sectiondata = [];
            this.sectiondata.push(['Comments:'+incident.supervisorComments]);
            content.push(this.getTableContent('', this.sectiondata, 'tableattached'));    

            if(incident.images){

                content.push({ text: 'Images', class: 'subheading'});    

                _.map(incident.images, async (record)=>{
                    content.push({
                        image: await this.getBase64ImageFromURL(this.getIncidentImage(record)), width: 200
                    });
                })
    
            }
            
            const styles = {
                header: {
                    fontSize: 10,
                    margin: [0 , 0, 0, 8],
                },
                mainHeader: {
                    fontSize: 12,
                    alignment: 'center',
                    bold: true
                },
                date: {
                    fontSize: 8,
                    margin: [0 ,8 , 0, 0],
                    color: '#969696'
                },
                table: {
                    fontSize: 8,
                    margin: [0, 10, 0, 0],
                    width: 100
                },
                tableattached: {
                    fontSize: 8,
                    margin: [0, 0, 0, 0],
                    width: 100
                },
                logo: {
                    alignment: 'right',
                    margin: [0, -35, 0, 0]
                },
                subheading:{
                    margin: [10, 10, 10, 10],
                }
            }

            this._pdfHelperService
                .generatePDF('download', false, 'A4', 'Incident Form', content, styles, _.snakeCase(_.toLower('Incident Form')))
                .catch(error => { throw error; });

        }, 500);  

    }

    getTableContent(field: any, report:any, attached: string): any
    {
        const data: Array<any> = [];
        if(field != ''){
            const headers: Array<any> = [];
            _.map(field, (val)=>{
                headers.push(
                    {text: val.text, colSpan: (val.colSpan)? val.colSpan: 1, fillColor: '#dbd7d7'}
                )
            })
            data.push(headers);
        }        
        
        _.map(report, (reo) => {
            const rows: Array<any> = [];
            _.map(reo, (fe) => {
                rows.push(
                    fe,
                )
            })
            data.push(rows);
        })
    
        var tablecontent = {
            table: {
                headerRows: 1,
                keepWithHeaderRows: true,
                dontBreakRows: false,
                widths: _.fill(new Array((field != '')? field.length: report[0].length), '*'),
                body: data,
            },
            layout: {
                defaultBorders: false,
                // paddingLeft: (i, node) => 4,
                // paddingRight: (i, node) => 4,
                paddingTop: (i, node) => 0,
                // paddingBottom: (i, node) => 4,
                // hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                // vLineWidth: (i, node)  => 1,
                // hLineColor: (i, node)  => '#f4f4f4',
                // vLineColor: (i, node)  => '#f4f4f4',
                // bold: (i, node) => (i === node.table.body.length - 1),
            },
            style: (attached== '')? 'table':'tableattached'
        };

        return tablecontent;
    }

    getIncidentImage(image: any) : string
    {
        if(image)
        {
            return this._commonService.getS3FullLink(image);
        }
    }

    getBase64ImageFromURL(url) {
        return new Promise((resolve, reject) => {
          var img = new Image();
          img.setAttribute("crossOrigin", "anonymous");
          img.onload = () => {
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL("image/png");
            resolve(dataURL);
          };
          img.onerror = error => {
            reject(error);
          };
          img.src = url;
        });
   }
}
