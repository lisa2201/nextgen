import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { InnovativeSolutionCasesClaimsService } from './innovative-solution-case-claims.service';


@Injectable()
export class InnovativeCaseClaimsDetailResolverService implements Resolve<Promise<any>>{

    constructor(private _innovativeSolutionCaseClaimsService: InnovativeSolutionCasesClaimsService, private _router: Router) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {

        return new Promise((resolve, reject) => {

            this._innovativeSolutionCaseClaimsService.getISCaseClaims(route.paramMap.get('id'))
                .then(() => {
                    resolve();
                })
                .catch((error) => {

                    reject(error);

                    setTimeout(() => {
                        this._router.navigate(['/innovative-solution-cases-claims']);
                    }, 200);

                });

        });

    }

}
