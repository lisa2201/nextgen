import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, first } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { UsersService } from './users.service';

import { AppConst } from 'app/shared/AppConst';
import { User } from '../user.model';

import { browserRefresh } from 'app/app.component';
import { Room } from '../../room/models/room.model';
import { CommonService } from 'app/shared/service/common.service';

@Injectable()
export class UserService implements Resolve<any>
{
    onUserChanged: BehaviorSubject<any>;
    onStateChange: BehaviorSubject<any>;
    routeParams: any;

    private user: User;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {UsersService} _usersService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _usersService: UsersService,
        private _commonService: CommonService,
    )
    {
        // Set the defaults
        this.onUserChanged = new BehaviorSubject([]);
        this.onStateChange = new BehaviorSubject([]);
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

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this._commonService.getSates(),
                this.getUser(this.routeParams.id)
            ])
            .then(([state, user]: [any, any]) => 
            {
                this.onStateChange.next({
                    countries: state
                });
                resolve();
            })
            .catch(error => 
            {
                if (browserRefresh && state.url !== '')
                {
                    this._router.navigate([_.head(_.filter(state.url.split('/'), _.size))]);
                }

                reject(error);
            });
        });
    }

    /**
     * Get user item
     * 
     * @returns {Promise<any>}
     */
    getUser(index: string): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            if (index === 'new')
            {
                this.onUserChanged.next(false);
                
                resolve(false);
            }
            else
            {
                this._usersService
                    .getUser(index)
                    .pipe(first())
                    .subscribe(
                        (response) =>
                        {
                            this.onUserChanged.next(response);
                            
                            resolve();
                        },
                        reject
                    );

            }
        });
    }

    getRooms(childId: string = ''): Observable<any>
    {
        let params = new HttpParams();

        if (childId !== '')
        {
            params = params.set('id', childId);
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-room-list`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Room(i, idx))),
                shareReplay()
            );
    }

    updateRoom(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-user-room`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0) 
                    {
                        this.user = new User(response.data);
                        this.onUserChanged.next(this.user);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    

}
