import { Branch } from 'app/main/modules/branch/branch.model';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';

export class Supplier {

    id: string;
    name: string;
    address?: string;
    creator?: any;
    isNew?: boolean;
    isLoading?: boolean;
    index?: number;
    statusLoading?: boolean;
    isDeleted?: boolean;
    branch?: any;
    gst?: number;
    /**
     * Constructor
     * 
     * @param {*} [immunisation]
     * @param {number} [index]
     */
    constructor(supplier?: any, index?: number) 
    {
        this.id = supplier.id || '';
        this.name = supplier.name || '';
        this.gst = supplier.gst || null;
        this.creator = supplier.creator? new User(supplier.creator) : null;
        this.address = supplier.address;
        this.branch = supplier.branch? new Branch(supplier.branch) : null;
        this.isDeleted = supplier.is_deleted
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
        this.statusLoading = false;
    }

    getImage(): string{
        return "assets/icons/flat/ui_set/strategy-and-management/svg/supplier.svg";
    }

    getGST(): string{
        return  this.gst ? `${this.gst}%` : 'N/A';
    }

}
