import { Observable, combineLatest } from 'rxjs';
import { debounceTime, map, shareReplay } from 'rxjs/operators';
import * as isEqual from 'fast-deep-equal';

export function dirtyCheck<U>(source: Observable<U>): any
{
    return <T>(valueChanges: Observable<T>): Observable<boolean> =>
    {
        // tslint:disable-next-line: deprecation
        const isDirty$ = combineLatest(
            source,
            valueChanges,
        ).pipe(
            debounceTime(300),
            map(([a, b]) => isEqual(a, b) === false),
            shareReplay({ bufferSize: 1, refCount: true }),
        );

        return isDirty$;
    };
}
