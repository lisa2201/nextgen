export class Bus
{
    id: string;
    name: string;
    deletedAt?: string; 
    createdAt?: string; 
    updatedAt?: string;

    isLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [role]
     * @param {number} [index]
     */
    constructor(bus?: any, index?: number)
    {
        this.id = bus.id;
        this.name = bus.name;
        this.createdAt = bus.created_on || null;
        this.updatedAt = bus.updated_on || null;
        this.deletedAt = bus.deleted_on || null;
        
        //
        this.isLoading = false;
        this.index = index || 0;
    }
}
