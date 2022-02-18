import { Injectable } from '@angular/core';
import { FinancialStatementsService } from './financial-statements.service';
import { Observable } from 'rxjs';

@Injectable()
export class AddFinancialStatementsResolverService {

    constructor(
        private _financialStatementsService: FinancialStatementsService
    ) { }

    resolve(): Observable<any> | Promise<any> | any {

        this._financialStatementsService.getParentList().subscribe();
        this._financialStatementsService.addStatementPageSetEvents();

    }

}
