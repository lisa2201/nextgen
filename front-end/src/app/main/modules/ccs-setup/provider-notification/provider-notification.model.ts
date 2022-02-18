export class ProviderNotification {
    public date: string;
    public source: string;
    public sourceId?: string;
    public description?: string;


    /**
     * Constructor
     *
     * @param ccs
     */
    // tslint:disable-next-line: no-shadowed-variable
    constructor(ProviderNotification?: any) {
        this.date = ProviderNotification.date;
        this.source = ProviderNotification.source;
        this.sourceId = ProviderNotification.sourceId;
        this.description = ProviderNotification.description;

    }

}
