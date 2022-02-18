import { User } from '../../user/user.model';

export class BalanceAdjustment {

    id: string;
    date: string;
    type: string;
    amount: number;
    description: string;

    user?: User;
    createdAt?: string;

    index: number;

    constructor(adjustment?: any, index?: number) {

        this.id = adjustment.id;
        this.date = adjustment.date;
        this.type = adjustment.type;
        this.amount = adjustment.amount;
        this.description = adjustment.description;
        this.createdAt = adjustment.created_at;
    
        this.user = adjustment.user ? new User(adjustment.user) : null;

        this.index = index || 0;

    }

}

