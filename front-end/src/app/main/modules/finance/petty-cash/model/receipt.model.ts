import { Branch } from 'app/main/modules/branch/branch.model';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { Category } from './category.model';
import { Supplier } from './supplier.model';

export class Receipt {

    id: string;
    category: Category;
    supplier?:Supplier;
    note?: string;
    date?: string;
    cost?: number;
    gst?: number;
    total?: number;
    gstAmount?: number;
    branch?: any;
    isNew?: boolean;
    isLoading?: boolean;
    index?: number;
    /**
     * Constructor
     * 
     * @param {*} [immunisation]
     * @param {number} [index]
     */
    constructor(receipt?: any, index?: number) 
    {
        this.id = receipt.id || '';
        this.category = receipt.category?  new Category(receipt.category) : null;
        this.supplier =  new Supplier(receipt.supplier) || null;
        this.branch = receipt.branch? new Branch(receipt.branch) : null;
        this.note = receipt.note||'';
        this.date = receipt.date||'';
        this.cost = receipt.cost||'';
        this.gst = receipt.gst||'';
        this.total = receipt.total||'';
        this.gstAmount = receipt.gst_amount || '';
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
    }

    getImage(): string{

        return "assets/icons/flat/ui_set/e-learning/svg/certificate.svg";
    }

}
