import {Injectable} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {BehaviorSubject, Observable, of, forkJoin} from 'rxjs';
import * as _ from 'lodash';
import {CommonService} from 'app/shared/service/common.service';

@Injectable({
    providedIn: 'root'
})
export class CountryResolverService implements Resolve<Observable<any>> {

    constructor(
        private _commonService: CommonService,
    ) {
    }

    resolve(): Observable<any> {

        return forkJoin([
            this._commonService.getCountries(),
        ]);

    }
}
