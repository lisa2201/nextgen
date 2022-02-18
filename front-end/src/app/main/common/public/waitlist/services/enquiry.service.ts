import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {Waitlist} from '../models/waitlist.model';
import {EnrollmentsService} from './enrollments.service';
import {browserRefresh} from 'app/app.component';
import * as _ from 'lodash';
import {AppConst} from 'app/shared/AppConst';

@Injectable()

export class EnquiryService {

    onUserChanged: BehaviorSubject<any>;
    routeParams: any;
    private enquiry: Waitlist;

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
                this.getEnquiryData(this.routeParams.id)
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
    getEnquiryData(index: any): Promise<any> {
        return new Promise((resolve, reject) => {

            if (index) {
                this._enrollservice
                    .getEnrolInfo(index, AppConst.appStart.ENQUIRY.NAME)
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
}
