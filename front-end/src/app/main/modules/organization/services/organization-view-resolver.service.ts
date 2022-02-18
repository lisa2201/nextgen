
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/internal/operators/first';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { OrganizationService } from './organization.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Organization } from '../Models/organization.model';
import { browserRefresh } from 'app/app.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Injectable()
export class OrganizationViewResolverService implements Resolve<any> {

    onOrganizationChanged: BehaviorSubject<any>;

    routeParams: any;

    private organization: Organization;

    /**
     * Constructor
     * @param {OrganizationService} _organizationService 
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _organizationService: OrganizationService,
        private _notificationService: NotificationService
    ) 
    { 
        // Set the defaults
        this.onOrganizationChanged = new BehaviorSubject([]);
    }

    /**
     * resolve
     * @param {ActivatedRouteSnapshot} route 
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any 
    {
        this.routeParams = route.params;

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getOrganization(this.routeParams.id)
            ])
            .then(([organization]: [any]) => 
            {
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
     * Get child item
     * 
     * @returns {Promise<any>}
     */
    getOrganization(index: string): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            if (index === 'new')
            {
                this.onOrganizationChanged.next(false);
                
                resolve(false);
            }
            else
            {
                this._organizationService
                    .getOrganizationInfo(index)
                    .pipe(first())
                    .subscribe(
                        (response) =>
                        {
                            this.organization = response;

                            this.onOrganizationChanged.next(this.organization);
                            
                            resolve();
                        },
                        reject
                    );

            }
        });
    }

    

}
