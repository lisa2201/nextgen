import { Branch } from 'app/main/modules/branch/branch.model';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';

export class Category {

    id: string;
    name: string;
    type?:string;
    creator?: any;
    isNew?: boolean;
    isLoading?: boolean;
    index?: number;
    branch?: any;
    isDeleted?: boolean;
    isUsed?: boolean;
    /**
     * Constructor
     * 
     * @param {*} [immunisation]
     * @param {number} [index]
     */
    constructor(category?: any, index?: number) 
    {
        this.id = category.id || '';
        this.name = category.name || '';
        this.creator =  category.creator ? new User(category.creator) : null;
        this.branch = category.branch? new Branch(category.branch) : null;
        this.type = category.type||'';
        this.isDeleted = category.is_deleted;
        this.isUsed = category.is_used;
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
    }

    getImage(): string{

        return "assets/icons/flat/ui_set/strategy-and-management/svg/categories.svg";
    }

    getTypeText(): string{

        return AppConst.PattrCashCategoryType.find(v=> v.value === this.type).name;
    }

}
