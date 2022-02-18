import {
    Directive,
    ElementRef,
    Host,
    HostBinding,
    HostListener,
} from '@angular/core';

@Directive({
    selector: '[horizontalScroll]',
})
export class HorizontalScrollDirective {

    private nativeElement: HTMLElement;
    @HostBinding('scrollLeft') private scrollLeft;

    constructor(@Host() element: ElementRef) 
    {
        this.nativeElement = element.nativeElement;
    }

    // tslint:disable-next-line: typedef
    @HostListener('wheel', ['$event']) wheelTurned(wheelEvent: WheelEvent) 
    {
        if (wheelEvent.deltaY) {
            this.scrollLeft = this.nativeElement.scrollLeft + wheelEvent.deltaY;
            wheelEvent.preventDefault();
        }
    }
}
