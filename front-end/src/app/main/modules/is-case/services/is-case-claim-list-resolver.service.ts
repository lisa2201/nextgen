import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { IsCaseService } from './is-case.service';

@Injectable()
export class IsCaseClaimListResolverService implements Resolve<Promise<any>> {

    constructor(private _isCaseService: IsCaseService) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {

        return new Promise((resolve, reject) => {

            this._isCaseService.listISCaseClaimSubmissions()
                .then(() => {
                    this._isCaseService.setISCaseClaimSubmissionsEvents();
                    resolve();
                })
                .catch((error) => {

                    // this._notification.displaySnackBar(error, NotifyType.ERROR);
                    
                    reject(error);

                });

        });

    }

}
