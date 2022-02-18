import {Injectable} from '@angular/core';
import {SectionService} from '../services/section.service';
import {Resolve} from '@angular/router';
import {Observable} from 'rxjs';
import {Sections} from '../models/sections.model';
import {AppConst} from 'app/shared/AppConst';

@Injectable({
    providedIn: 'root'
})
export class WailtistFormResolverService implements Resolve<Observable<any>> {

    constructor(private _sectionService: SectionService) {
    }

    resolve(): Observable<Sections> | Promise<Sections> | any {
        return this._sectionService.enrolmentDynamicFields(AppConst.appStart.WAITLIST.NAME)
    }
}
