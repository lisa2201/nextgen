import { Injectable } from '@angular/core';
import { FinancialStatementsService } from './financial-statements.service';
import { forkJoin, Observable } from 'rxjs';
import { FinanceService } from '../../shared/services/finance.service';

@Injectable()
export class FinancialStatementsListResolverService {

    constructor(
        private _financialStatementsService: FinancialStatementsService,
        private _financeService: FinanceService
    ) { }

    resolve(): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {

            forkJoin([
                this._financialStatementsService.listFinancialStatements(),
                this._financeService.getSelectParentList()
            ])
            .subscribe(
                ([statements, parents]) => {
                    this._financialStatementsService.setEvents();
                    this._financialStatementsService.onFilterParentChanged.next(parents);
                    resolve(null);
                },
                (error) => {
                    reject(error);
                }
            );

        });

    }
    
}
