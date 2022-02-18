import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'convertTimeString'
})
export class ConvertNumberToTimeStringPipe implements PipeTransform
{
    transform(value: number, type: string = '12h'): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return '--:--';
        }

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';

        return `${h}:${m} ${a}`;
    }
}
