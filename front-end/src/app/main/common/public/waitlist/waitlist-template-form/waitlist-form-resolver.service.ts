import {Injectable} from '@angular/core';
import {SectionService} from '../services/section.service';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {forkJoin, Observable, throwError} from 'rxjs';
import {AppConst} from 'app/shared/AppConst';
import {AuthService} from 'app/shared/service/auth.service';
import {map, shareReplay} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class WaitlistFormResolverService implements Resolve<Observable<any>> {

    constructor(private _sectionService: SectionService, private _authService: AuthService) {
    }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        if (this._authService._domain === AppConst.appStart.ENROLLMENT.NAME) {
            // Sitemanager mode
            const orgId = route.queryParamMap.get(AppConst.queryParamKeys.ENROLMENT.orgId);

            if (orgId) {
                // Get branch list
                return this._sectionService.getBranches(orgId);
            } else {
                return throwError('Organization ID not found');
            }

        } else {
            // Branch mode
            return new Promise((resolve, reject) => {
                this._authService.getClientInformation().pipe(
                    map((response) => response),
                    shareReplay()
                ).subscribe((value) => {
                        this._sectionService.enrolmentDynamicFields(value['data'].id, AppConst.appStart.WAITLIST.NAME).subscribe(formSettings => resolve({
                            branchData: value['data'],
                            formSettings: formSettings
                        }));
                    },
                    reject
                )
            })

        }

    }
}
