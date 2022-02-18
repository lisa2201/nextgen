import { Injectable } from '@angular/core';
import { BalanceAdjustmentsService } from './balance-adjustments.service';
import { Observable } from 'rxjs';

@Injectable()
export class BalanceAdjustmentsListResolverService {

  constructor(
    private _balanceAdjustmentsService: BalanceAdjustmentsService
  ) { }

  resolve(): Observable<any> | Promise<any> | any {

    return new Promise((resolve, reject) => {

      this._balanceAdjustmentsService.listBalanceAdjustments()
        .then(() => {

          this._balanceAdjustmentsService.setEvents();

          resolve();

        })
        .catch(reject);

    });

  }

}
