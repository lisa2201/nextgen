import { Pipe, PipeTransform } from '@angular/core';

import * as moment from 'moment';
import 'moment-timezone';

@Pipe({
    name: 'formatMoment'
})
export class FormatMomentParseDatePipe implements PipeTransform
{
    transform(value: any, type: string): string
    {
        if (value === null || value === '')
        {
            return '';
        }

        try
        {
            return moment(value).format(type);
        }
        catch (error)
        {
            return 'unknown format';
        }
    }
}
