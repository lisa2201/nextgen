import { Observable, NEVER, BehaviorSubject } from 'rxjs';
import { switchMap, materialize, dematerialize } from 'rxjs/operators';

export class PauseableObservable<T> extends Observable<T> {

    private pauser: BehaviorSubject<boolean>;

    pause(): void 
    {
        this.pauser.next(true);
    }

    resume(): void 
    {
        this.pauser.next(false);
    }
}

export function pauseable(): any 
{
    return function pauseFn<T>(source: Observable<T>): PauseableObservable<T> 
    {
        const pauseableProto = PauseableObservable.prototype;

        const pauser = new BehaviorSubject(false);
        const newSource = pauser.pipe(
            switchMap((paused) => paused ? NEVER : source.pipe(materialize())),
            dematerialize()
        );

        // tslint:disable-next-line: no-shadowed-variable
        const pauseable: any = Object.create(newSource, {
            pause: { value: pauseableProto.pause },
            resume: { value: pauseableProto.resume },
            pauser: { value: pauser },
        });

        return pauseable as PauseableObservable<T>;
    };
}
