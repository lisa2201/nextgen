import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Pipe, PipeTransform } from '@angular/core';
import { AuthService } from '../service/auth.service';

@Pipe({
    name: 'SetGlobalDTFormat'
})
export class SetGlobalDateFormatPipe implements PipeTransform
{
    /**
     * Constructor
     * 
     * @param {AuthService} _authService
     */
    constructor(
        private _authService: AuthService
    ) 
    {
       
    }

    transform(value: any, showDate: boolean = true, showTime: boolean = true): string
    {
        const DefaultDateFormat: string = 'YYYY-MM-DD';
        const DefaultTimeFormat: string = 'hh:mm:ss A';

        let returnValue = 'N/A';

        try 
        {
            const dt = DateTimeHelper.parseMoment(value);

            returnValue = dt.format(`${showDate ? DefaultDateFormat : ''}${showTime ? ' ' + DefaultTimeFormat : ''}`);

            if (showDate || showTime)
            {
                if (this._authService.isAuthenticated)
                {
                    // dt.tz(this._authService.getClient().timeZone);

                    const centerSettings = this._authService.getClient() ? this._authService.getClient().centerSettings : null;

                    if (centerSettings && centerSettings?.date_format && centerSettings?.time_format)
                    {
                        returnValue = dt.format(`${showDate ? centerSettings.date_format : ''}${showTime ? ' ' + centerSettings.time_format : ''}`);
                    }
                }
            }
        } 
        catch (error) 
        {
            console.error('date time format error!', error);
        }

        return returnValue;
    }
}
