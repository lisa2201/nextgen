import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { IsCaseService } from './is-case.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Injectable()
export class IsCaseDetailResolverService implements Resolve<Promise<any>>{

    constructor(private _isCaseService: IsCaseService, private _router: Router, private _notification: NotificationService) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {

        return new Promise((resolve, reject) => {

            this._isCaseService.getISCase(route.paramMap.get('id'))
                .then(() => {
                    resolve();
                })
                .catch((error) => {

                    this._notification.displaySnackBar(error, NotifyType.ERROR);
                    
                    this._router.navigate(['/inclusion-support', 'cases']);

                });

        });

    }

}
