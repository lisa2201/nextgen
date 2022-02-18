import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {AppConst} from 'app/shared/AppConst';
import {map} from 'rxjs/operators';
import {AuthService} from 'app/shared/service/auth.service';
import {Sections} from '../models/sections.model';

const httpOptions = {
    headers: new HttpHeaders({
        'Content-Type': 'application/json'
    })
};

@Injectable({
    providedIn: 'root'
})
export class SectionService {
    branchDetails: any;
    enrolSections: Sections[] = []
    waitlistSections: Sections[] = []

    constructor(private _httpClient: HttpClient, private _auth: AuthService) {
        this.branchDetails = this._auth.getClient();
    }

    enrolmentDynamicFields(type): Observable<any> {
        const post = {
            'form': type
        }
        return this._httpClient.post<Sections>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/waitlist_format-creater`, post);
    }

    sectionNameRename(values): Observable<any> {
        const post = {
            'section_id': values.sec_id,
            'value': values.name,
            'form': values.form,
        }
        return this._httpClient.post<Sections>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/section-rename`, post);
    }


    storetWaitlistSections(sections: Sections[]): void {
        this.waitlistSections = sections
    }

    getWaitlistSections(): Sections[] {
        return this.waitlistSections
    }

    storeSections(sections: Sections[]): void {
        this.enrolSections = sections
    }

    getSections(): Sections[] {
        return this.enrolSections
    }


}
