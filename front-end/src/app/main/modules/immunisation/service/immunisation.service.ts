import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { AppConst } from 'app/shared/AppConst';
import { Immunisation } from '../model/immunisation.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { AuthService } from 'app/shared/service/auth.service';
import { BranchService } from '../../branch/services/branch.service';
import { Branch } from '../../branch/branch.model';
import { CommonService } from 'app/shared/service/common.service';
import { Organization } from '../../organization/Models/organization.model';


@Injectable()
export class ImmunisationService implements Resolve<any>
{

    private _unsubscribeAll: Subject<any>;
    private immunisation: Immunisation[];

    OnImmunisationChanged: BehaviorSubject<any>;
    onImmunisationStatusChanged: Subject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onFilterBranchesChanged: BehaviorSubject<any>;
    onSearchTextChanged: Subject<any>;

    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _branchService: BranchService,
        private _commonService: CommonService
    )
    {
        // Set the defaults
        this.OnImmunisationChanged = new BehaviorSubject([]);
        this.onImmunisationStatusChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this._unsubscribeAll = new Subject();
        this.onFilterBranchesChanged = new BehaviorSubject([]);

        this.onSearchTextChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
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
        return new Promise<void>((resolve, reject) =>
        {
            if (this._authService.isOwner())
            {
                Promise.all([
                    this.getImmunisations(),
                    this.getBranches()
                ])
                .then(([invitations, branches]: [any, any]) => 
                {
                    this.setEvents(branches);
                    
                    resolve();
                })
                .catch(error => 
                {
                    reject(error);
                });
            }
            else if (this._authService.isAdministrative()){
                Promise.all([
                    this.getImmunisations()
                ])
                .then(([immunisation]: [any]) => 
                {
                    this.setEvents();
                    resolve();
                })
                .catch(error => 
                {
                    reject(error);
                });
            }
            else if(this._authService.getUserLevel() === AppConst.roleLevel.ROOT){

                Promise.all([
                    this.getImmunisations(),
                    this.getBranches()
                ])
                .then(([invitations, branches]: [any, any]) => 
                {
                    this.setEvents(branches);
                    resolve();
                })
                .catch(error => 
                {
                    reject(error);
                });
            }
            else
            {
                reject();    
            }

        });
    }

        /**
     * set events after resolve
     */
    setEvents(branches: Branch[] = []): void
    {
        
        if (!_.isEmpty(branches))
        {
            this.onFilterBranchesChanged.next(branches);
        }

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;

                this.getImmunisations();
            });


        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination))
                {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.getImmunisations();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;
                
                this.getImmunisations();
            });
    }


    getBranches(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._branchService
                .getBranchesByUser()
                .pipe(
                    map(response => !_.isEmpty(response) ? response.map((i: any, idx: number) => new Branch(i, idx)) : [])
                )
                .subscribe((response: any) =>
                    {
                        resolve(response);
                    },
                    reject
                );
        });
    }

    
    getImmunisations(): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            // set table loader
            this.onTableLoaderChanged.next(true);

            if (_.isNull(this.pagination))
            {
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
                .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-immunisation-list`, { params })
                .pipe(
                    map(response =>
                    {
                        this.immunisation = response.data.map((i: any, idx: number) => new Immunisation(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.immunisation],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.OnImmunisationChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * Create new immunisation
     * 
     * @returns {Observable<any>}
     */
    storeImmunisation(data: object): Observable<any>
    {
        console.log('data', data);
        
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-immunisation`, data)
            .pipe(
                map(response => 
                {

                    this.getImmunisations();
                    //get reminder 
                    this._commonService.getReminders();
                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Get immunisation item
     * 
     * @returns {Observable<any>}
     */
    getImmunisation(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-immunisation-info`, { params })
            .pipe(
                map(response => new Immunisation(response.data)),
                shareReplay()
            );
    }

    /**
     * Update immunisation item
     * 
     * @returns {Observable<any>}
     */
    updateImmunisation(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-immunisation`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Immunisation(response.data);
    
                        const index = this.immunisation.findIndex((val) => val.id === item.id);

                        item.index = this.immunisation[index].index;
                        this.immunisation[index] = item;

                        setTimeout(() => this.OnImmunisationChanged.next(
                            {
                                items: [...this.immunisation],
                                totalDisplay: this.totalDisplayRecords,
                                total: this.totalRecords,
                                filtered: this.isFiltered
                            }
                        ), 500);
                    }
                    // get reminder
                    this._commonService.getReminders();
                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Delete a immunisation
     * 
     * @returns {Observable<any>}
     */
    deleteImmunisation(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-immunisation`, { params })
            .pipe(
                map(response => 
                {
                    this.immunisation = this.immunisation.filter((i) => i.id !== index).map((v, i) =>
                    {
                        v.index = i;
                        return v;
                    });

                    setTimeout(() => this.OnImmunisationChanged.next(
                        {
                            items: [...this.immunisation],
                            totalDisplay: this.totalDisplayRecords-1,
                            total: this.totalRecords-1,
                            filtered: this.isFiltered
                        }
                    ), 500);

                    return response.message;
                }),
                shareReplay()
            );
    }

    updateStatus(data: object, index: number): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-immunisation-status`, data)
            .pipe(
                map(response => 
                {
                    this.getImmunisations();
                    // if (response.data && _.keys(response.data).length > 0)
                    // {
                    //     const item = new Immunisation(response.data);
                        
                    //     setTimeout(() => this.onImmunisationStatusChanged.next({ status: item.status, position: index }), 200);
                    // }

                    return response.message;
                }),
                shareReplay()
            );
    }

    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/import-booking-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || response.data.orgs.length < 1)
                    {
                        return ;
                    }
                    else
                    {
                        return response.data.orgs.map((i: any, idx: number) => new Organization(i, idx));

                    }
                }),
                shareReplay()
            );
    }

    
    importImmunisation(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/import-immunisation`, data)
            .pipe(
                map(response => 
                {
                    this.getImmunisations();

                    // this._commonService.getReminders();
                    return response.message;
                }),
                shareReplay()
            );
    }
}
