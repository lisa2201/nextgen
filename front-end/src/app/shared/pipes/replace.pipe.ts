import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'replace',
    pure: true
})
export class ReplaceStringPipe implements PipeTransform
{
    transform(value: string, regexValue: string, replaceValue: string): any
    {
        const regex = new RegExp(regexValue, 'g');
        
        return value.replace(regex, replaceValue);
    }
}
