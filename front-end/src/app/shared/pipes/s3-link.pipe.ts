import { Pipe, PipeTransform } from '@angular/core';
import { CommonService } from '../service/common.service';

@Pipe({
    name: 's3Link',
    pure: true
})
export class S3LinkPipe implements PipeTransform
{

    constructor (private _commonService: CommonService) {}

    transform(path: string, ...args: any[]): string
    {
        return this._commonService.getS3FullLink(path);
    }
    
}
