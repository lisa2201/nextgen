import { Branch } from 'app/main/modules/branch/branch.model';
import * as _ from 'lodash';
import { Category } from './category.model';

export class Reimbursement {

    id: string;
    category: Category;
    note?: string;
    date?: string;
    total?: number;
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
    constructor(reimbursement?: any, index?: number) 
    {
        this.id = reimbursement.id || '';
        this.category = reimbursement.category?  new Category(reimbursement.category) : null;
        this.branch = reimbursement.branch? new Branch(reimbursement.branch) : null;
        this.note = reimbursement.note||'';
        this.date = reimbursement.date||'';
        this.total = reimbursement.total||'';
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
    }

    getImage(): string{
        return "assets/icons/flat/ui_set/e-learning/svg/vocabulary.svg";
    }

}
