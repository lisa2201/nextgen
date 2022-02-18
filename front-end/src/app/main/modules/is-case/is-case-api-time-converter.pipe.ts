import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';

@Pipe({
  name: 'isCaseApiTimeConverter'
})
export class IsCaseApiTimeConverterPipe implements PipeTransform {

  transform(value: string, ...args: any[]): string {

    let time = '00:00';

    if (!value) {
        return time;
    }

    const splitData = _.split(value, ':');

    const momentObj = moment.duration({
        hour: parseInt(splitData[0], 10),
        minute: parseInt(splitData[1], 10)
    });

    time = Math.floor(momentObj.asHours()).toString().padStart(2, '0') + moment.utc(momentObj.asMilliseconds()).format(':mm');
    
    return time;

  }

}
