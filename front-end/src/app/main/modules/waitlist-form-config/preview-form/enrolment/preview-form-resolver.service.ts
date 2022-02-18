import {Injectable} from '@angular/core';
import {SectionService} from '../../services/section.service';
import {Resolve} from '@angular/router';
import {forkJoin, Observable} from 'rxjs';
import {Sections} from '../../models/sections.model';

@Injectable({
    providedIn: 'root'
})
export class PreviewFormResolverService implements Resolve<Observable<any>> {

    constructor(private _sectionService: SectionService) {
    }

    resolve(): Observable<Sections> | Promise<Sections> | any {

        return this._sectionService.enrolmentDynamicFields('enrolment')

    }
}
