import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { InnovativeSolutionCasesService } from './innovative-solution-cases.service';

@Injectable()
export class InnovativeCaseDetailResolverService implements Resolve<Promise<any>>{

    constructor(private _innovativeSolutionCaseService: InnovativeSolutionCasesService,
                private _router: Router) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {

        return new Promise((resolve, reject) => {

            this._innovativeSolutionCaseService.getISCase(route.paramMap.get('id'))
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    
                    reject(error);

                    setTimeout(() => {
                        this._router.navigate(['/innovative-solution-cases']);
                    }, 200);

                });

        });

    }

}
