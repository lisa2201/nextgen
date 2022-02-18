import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {NGXLogger} from 'ngx-logger';
import {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    Resolve
} from '@angular/router';
import {takeUntil, map, shareReplay, finalize} from 'rxjs/operators';
import {AppConst} from 'app/shared/AppConst';
import * as _ from 'lodash';
import {User} from '../../user/user.model';
import {Child} from '../../child/child.model';

@Injectable()
export class ProfileSettingService implements Resolve<any> {
    onDataChanged: BehaviorSubject<any>;
    // onRoomChangedUpdated: Subject<any>;
    // onRoomStatusChanged: Subject<any>;
    // onPaginationChanged: Subject<any>;
    // onSearchTextChanged: Subject<any>;
    // onSortChanged: Subject<SortProp>;
    // onFilterChanged: Subject<any>;
    // onTableLoaderChanged: Subject<any>;
    // onRoomStore: Subject<any>;
    // onRoomDelete: Subject<any>;

    private _unsubscribeAll: Subject<any>;

    private user: User;
    child: Child[];

    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [8, 16, 20];

    totalItems = 0;
    pagination: any | null = null;
    filterBy: any = '0';
    sortBy: any | null = null;
    searchText: string | null = null;
    totalRecords = 0;
    totalDisplayRecords = 0;
    isFiltered = false;

    // loadingData : boolean = false;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(private _httpClient: HttpClient, private _logger: NGXLogger) {
        this.onDataChanged = new BehaviorSubject([]);
        // this.onRoomStatusChanged = new Subject();
        // this.onRoomChangedUpdated = new Subject();

        // this.onSearchTextChanged = new Subject();
        // this.onSortChanged = new Subject();
        // this.onFilterChanged = new Subject();
        // this.onPaginationChanged = new Subject();
        // this.onTableLoaderChanged = new Subject();
        // this.onRoomStore = new Subject();
        // this.onRoomDelete = new Subject();

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

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        return new Promise((resolve, reject) => {
            Promise.all([this.getUserData()])
                .then(([profile]: [any]) => {
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    getUserData(): Promise<any> {
        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-profile-info`
                )
                .pipe(
                    map(response => {
                        this.child = response.child;
                        this.user = new User(response.data);
                    }),
                    shareReplay()
                )
                .subscribe((response: any) => {
                    this.onDataChanged.next({
                        user: this.user,
                        child: this.child
                    });
                    resolve();
                }, reject);
        });
    }

    updateUserDate(data: object): Observable<any> {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-user-data`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.user = new User(response.data);
                        this.onDataChanged.next({
                            user: this.user,
                            child: this.child
                        });
                        return {
                            userData: this.user,
                            message: response.message
                        };
                    }
                }),
                shareReplay()
            );
    }

    updateUserImageOnly(data: object): Observable<any> {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-staff-image`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.user = new User(response.data);
                        this.onDataChanged.next({
                            user: this.user,
                            child: this.child
                        });
                        return {
                            userData: this.user,
                            message: response.message
                        };
                    }
                }),
                shareReplay()
            );
    }

    deleteUserImageOnly(data: object): Observable<any> {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-staff-image`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.user = new User(response.data);
                        this.onDataChanged.next({
                            user: this.user,
                            child: this.child
                        });
                        return {
                            userData: this.user,
                            message: response.message
                        };
                    }
                }),
                shareReplay()
            );
    }

    updateUserEmailNotification(data: object): Observable<any> {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/user-email-notification`, data)
            .pipe(
                map(response => {
                    return {
                        message: response.message
                    };

                }),
                shareReplay()
            );
    }
}
