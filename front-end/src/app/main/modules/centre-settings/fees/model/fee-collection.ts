import { Fee } from './fee.model';

class FeeCollection extends Array<Fee> {

    constructor(...items: Fee[]) 
    {
        super(...items);
    }

    getFirst(): any 
    {
        return this[0];
    }
}