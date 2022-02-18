import { User } from '../../user/user.model';

export class FinancialStatement {

    id: string;
    startDate: string;
    endDate: string;
    generationMethod: string;
    amount: number;
    url: string;
    createdAt: string;

    user?: User;

    index: number;

    constructor(statement: any, index: number) {

        this.id = statement.id;
        this.startDate = statement.start_date;
        this.endDate = statement.end_date;
        this.generationMethod = statement.generation_method;
        this.amount = statement.amount;
        this.url = statement.url;
        this.createdAt = statement.created_at;

        this.user = statement.user ? new User(statement.user) : null;

        this.index = index || 0;
        
    }

}
