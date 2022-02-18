import {Injectable} from '@angular/core';
import {SectionService} from '../services/section.service';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {forkJoin, Observable, throwError} from 'rxjs';
import {AppConst} from 'app/shared/AppConst';
import {AuthService} from 'app/shared/service/auth.service';

@Injectable()
export class EnquiryResolverService implements Resolve<Observable<any>> {

    constructor(private _sectionService: SectionService, private _authService: AuthService) {
    }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        if (this._authService._domain === AppConst.appStart.ENROLLMENT.NAME) {
            // Sitemanager mode
            const orgId = route.queryParamMap.get(AppConst.queryParamKeys.ENQUIRY.orgId);

            if (orgId) {
                // Get branch list
                return this._sectionService.getBranches(orgId);
            } else {
                return throwError('Organization ID not found');
            }

        } else {
            // Branch mode
            const client = this._authService.getClient();

            if (client && client.id) {
                // Get form fields
                return this._sectionService.enrolmentDynamicFields(client.id, AppConst.appStart.ENQUIRY.NAME)
            } else {
                return throwError('Branch ID not found')
            }

        }

    }
}
