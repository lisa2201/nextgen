export class AdjustmentItem {

    id: string;
    name: string;
    description: string;
    index: number;
    
    constructor(item?: any, index?: number) {

        this.id = item.id;
        this.name = item.name;
        this.description = item.description;

        this.index = index || 0;
    }

}
