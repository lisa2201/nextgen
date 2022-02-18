import { DoWork, ObservableWorker } from 'observable-webworker';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

@ObservableWorker()
export class VersionCheckerWorker implements DoWork<any, any> 
{
    public work(input$: Observable<any>): Observable<any> 
    {
        return input$.pipe(
            map(response => response.url),
            switchMap(url => 
            {
                return ajax.get(url, {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    })
                    .pipe(
                        shareReplay(),
                        map(result => result.response),
                        catchError(error => 
                        {
                            return throwError({
                                code: error.status,
                                message: error.xhr.statusText
                            });
                        })
                    );
            })
        );
    }
}