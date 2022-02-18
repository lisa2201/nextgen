import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'convert24StringTime'
})
export class ConvertString24To12TimeStringPipe implements PipeTransform
{
    transform(value: string, includeSec: boolean): string
    {
        if (!value || value === '')
        {
            return '--:--';
        }

        const timeParts = value.split(':');

        const hour = +timeParts[0] % 12 || 12;
        const mandarin = +timeParts[0] < 12 ? 'AM' : 'PM';

        return `${hour}:${timeParts[1]}${(includeSec ? ':' + timeParts[2] : '')} ${mandarin}`;
    }
}
