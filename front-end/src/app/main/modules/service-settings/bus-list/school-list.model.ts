import * as _ from "lodash";
import { Bus } from "./bus-list.model";

export class School
{
    id: string;
    address: string;
    name?: string;
    bus?: Bus[];
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [role]
     * @param {number} [index]
     */
    constructor(school?: any, index?: number)
    {
        this.id = school.id;
        this.name = school.school_name;
        this.address = school.school_address;
        this.bus = (school.bus && !_.isNull(school.bus)) ? school.bus.map((i: any, idx: number) => new Bus(i, idx)) : [];
        this.index = index || 0;
    }
}
