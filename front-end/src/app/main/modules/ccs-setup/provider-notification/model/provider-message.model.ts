export class ProviderMessage{
    public id: string;
    public dateTime?: string;
    public providerId?: string;
    public serviceId?: string;
    public source?: string;
    public sourceId?: number;

    public type?: string;
    public desc?: string;
    public subject?: string;


    constructor(message?: any) {
        this.id = message.id;
        this.dateTime = message.dateTime;
        this.providerId = message.providerID;
        this.serviceId = message.serviceID;
        this.source = message.source;
        this.sourceId = message.sourceID;
        this.type = message.type;
        this.desc = message.body;
        this.subject = message.subject;
    }

}
