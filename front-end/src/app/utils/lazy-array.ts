import { Observable, of, from, scheduled, animationFrameScheduler } from 'rxjs';
import { mergeMap, bufferCount, concatMap, scan, delay, tap } from 'rxjs/operators';

export function lazyArray<T>(delayMs = 0, concurrency = 2): any
{
    let isFirstEmission = true;

    return (source$: Observable<T[]>) => {
        return source$.pipe(
            mergeMap((items) => 
            {
                if (!isFirstEmission) 
                {
                    return of(items);
                }

                const items$ = from(items);

                return items$.pipe(
                    bufferCount(concurrency),
                    concatMap((value, index) => 
                    {
                        const delayed = delay(index * delayMs);

                        return scheduled(
                            of(value),
                            animationFrameScheduler
                        ).pipe(delayed);
                    }),
                    scan((acc: T[], steps: T[]) => 
                    {
                        return [...acc, ...steps];
                    }, []),
                    tap((scannedItems: T[]) => 
                    {
                        const scanDidComplete = scannedItems.length === items.length;

                        if (scanDidComplete) 
                        {
                            isFirstEmission = false;
                        }
                    })
                );
            })
        );
    };
}
