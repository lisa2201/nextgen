import { Directive, EventEmitter, HostListener, OnInit, Output, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Directive({
    selector: '[debounceClick]'
})
export class DebounceClickDirective implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    private clicks = new Subject();

    @Input() debounceTime = 250;
    @Output() debounceClick = new EventEmitter();
    
    /**
     * Constructor
     */
    constructor()
    { 
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void
    {
        this.clicks
            .pipe(
                debounceTime(this.debounceTime),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(e => this.debounceClick.emit(e));
    }

    ngOnDestroy(): void
    {
        this.debounceClick.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    @HostListener('click', ['$event'])
    clickEvent(event: any): void
    {    
        event.preventDefault();
        event.stopPropagation();
        this.clicks.next(event);
    }
}
