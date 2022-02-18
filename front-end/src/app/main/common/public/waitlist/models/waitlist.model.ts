import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';

export class Waitlist {

    id: any;
    waitlist_info: object;
   

    /**
     * Constructor
     *
     * @param data
     */
    constructor(data?: any, index?: number)
    {
        this.id = data.id || '';
        this.waitlist_info = data.waitlist_info || '';

    }

}
