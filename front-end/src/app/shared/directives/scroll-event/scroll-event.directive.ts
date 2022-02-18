import { Directive, HostListener, Output, EventEmitter, Input } from '@angular/core';

export type ScrollEvent = {
    isReachingBottom: boolean,
    isReachingTop: boolean,
    originalEvent: Event,
    isWindowEvent: boolean,
    scrollPositionY: number
};

declare const window: Window;

@Directive({
    selector: '[scrollEvent]'
})
export class ScrollEventDirective 
{
    /**
     * In your template you may now add the scrollEvent attribute and (onscroll) event to any element. 
     * you can also add [bottomOffset] or [topOffset] to change when reaching bottom or top detection, 
     * bot values defaults to 100px, the value should be a number in pixels.
     */

    @Output() 
    onscroll = new EventEmitter<ScrollEvent>();

    @Input() 
    bottomOffset = 100;

    @Input() 
    topOffset = 100;

    constructor() { }

    // handle host scroll
    @HostListener('scroll', ['$event']) public scrolled($event: Event): void 
    {
        this.elementScrollEvent($event);
    }

    // handle window scroll
    @HostListener('window:scroll', ['$event']) public windowScrolled($event: Event): void 
    {
        this.windowScrollEvent($event);
    }

    protected windowScrollEvent($event: Event): void 
    {
        const target = $event.target as Document;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const isReachingTop = scrollTop < this.topOffset;
        const isReachingBottom = ( target.body.offsetHeight - (window.innerHeight + scrollTop) ) < this.bottomOffset;
        const emitValue: ScrollEvent = { isReachingBottom, isReachingTop, originalEvent: $event, isWindowEvent: true, scrollPositionY: scrollTop };

        this.onscroll.emit(emitValue);
    }

    protected elementScrollEvent($event: Event): void 
    {
        const target = $event.target as HTMLElement;
        const scrollPosition = target.scrollHeight - target.scrollTop;
        const offsetHeight = target.offsetHeight;
        const isReachingTop = target.scrollTop < this.topOffset;
        const isReachingBottom = (scrollPosition - offsetHeight) < this.bottomOffset;
        const emitValue: ScrollEvent = { isReachingBottom, isReachingTop, originalEvent: $event, isWindowEvent: false, scrollPositionY: target.scrollTop };

        this.onscroll.emit(emitValue);
    }

}