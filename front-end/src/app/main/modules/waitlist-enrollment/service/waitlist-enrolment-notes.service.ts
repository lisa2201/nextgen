import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {HttpClient} from '@angular/common/http';
import {AppConst} from 'app/shared/AppConst';
import {map, shareReplay, tap} from 'rxjs/operators';
import {Subject} from 'rxjs/internal/Subject';

@Injectable()

export class WaitlistEnrolmentNotesService {

    private _notesChanged = new Subject<void>();
    private addNewNote = new Subject<string>();
    private editData = [];

    constructor(
        private _httpClient: HttpClient
    ) {
    }

    get refreshNeed() {
        return this._notesChanged
    }

    getNotesForEnrolmentOrWaitlist(item: any): Observable<any> {

        const params = {
            'wait_enrol_id': item.id,
            'status': item.status,
        }
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrol-wait-note`, params)
            .pipe(
                map((response) => {
                    return response;
                }),
                shareReplay()
            );
    }

    saveNote(params): Observable<any> {
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/save-note`, params)
            .pipe(
                tap(() => {
                    this._notesChanged.next();
                    setTimeout(() => this.addNewNote.next('view'), 500)
                }),
                shareReplay()
            );
    }

    deleteNote(params): Observable<any> {
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-note`, params)
            .pipe(
                tap(() => {
                    this._notesChanged.next();
                    this.addNewNote.next('view');
                }),
                shareReplay()
            );
    }


    public getAddNewNoteStatus(): Observable<string> {
        return this.addNewNote.asObservable();
    }

    public setAddNewNoteStatus(status: string): void {
        this.addNewNote.next(status);
    }

    public getEditNote(): any {
        return this.editData;
    }

    public setEditNote(data): void {
        this.editData = data;
    }

}
