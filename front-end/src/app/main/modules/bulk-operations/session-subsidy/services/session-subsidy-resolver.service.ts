import { Injectable } from '@angular/core';
import { SessionSubsidyService } from './session-subsidy.service';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable()
export class SessionSubsidyResolverService implements Resolve<any> {

    constructor(private _sessionSubsidyService: SessionSubsidyService) { }

    resolve(): Observable<any> {
        return this._sessionSubsidyService.getDependency();
    }
}
