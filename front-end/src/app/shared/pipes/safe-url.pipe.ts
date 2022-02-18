import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'safeUrl'
})
export class SafeUrlPipe implements PipeTransform {

    /**
     * Constructor
     *
     * @param {DomSanitizer} _sanitizer
     */
    constructor(
        private _sanitizer: DomSanitizer
    ) 
    {

    }

    transform(url: string, ...args: any[]): any 
    {
        return this._sanitizer.bypassSecurityTrustResourceUrl(url);
    }

}
