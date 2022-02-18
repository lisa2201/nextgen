import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Pipe({
    name: 'safeHtml'
})
export class SafeHtmlPipe implements PipeTransform 
{

    /**
     * Constructor
     * 
     * @param {DomSanitizer} _sanitizer
     */
    constructor(
        protected _sanitizer: DomSanitizer
    ) 
    {

    }

    public transform(value: any, type: string): any 
    {
        const sanitizedContent = DOMPurify.sanitize(value);

        return this._sanitizer.bypassSecurityTrustHtml(sanitizedContent);

    }
}