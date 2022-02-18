import {Injectable} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {browserRefresh} from 'app/app.component';
import * as _ from 'lodash';
import {HttpClient} from '@angular/common/http';
import {AppConst} from 'app/shared/AppConst';
import {map, shareReplay} from 'rxjs/operators';
import {EnrollmentsService} from './enrollments.service';
import {Waitlist} from '../models/waitlist.model';
import {Organization} from '../../organization/Models/organization.model';

@Injectable()
export class EnrollmentService implements Resolve<any> {

    onUserChanged: BehaviorSubject<any>;
    routeParams: any;
    private waitlist: Waitlist;

    constructor(
        private _router: Router,
        private _httpClient: HttpClient,
        private _enrollservice: EnrollmentsService
    ) {
    }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {


        this.routeParams = route.params;

        return new Promise((resolve, reject) => {
            Promise.all([
                this.getEnrolldata(this.routeParams.id)
            ])
                .then(([waitlist]: [any]) => {
                    resolve(waitlist);
                })
                .catch(error => {
                    if (browserRefresh && state.url !== '') {
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
    getEnrolldata(index: any): Promise<any> {
        return new Promise((resolve, reject) => {

            if (index) {
                this._enrollservice
                    .getEnrolInfo(index)
                    .pipe()
                    .subscribe(
                        (response) => {
                            resolve(response);
                        },
                        reject
                    );
            }
        });
    }

    getOrganizationInfo(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-org-info`, {responseType: 'json'})
            .pipe(
                map(response => new Organization(response.data)),
                shareReplay()
            );
    }

}

