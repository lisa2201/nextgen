import { DateTimeHelper } from "app/utils/date-time.helper";

export class ParentPaymentMethod {

    id: string;
    accountName?: string;
    address1: string;
    address2?: string;
    city: string;
    country: string;
    countryCode: string;
    zipCode: string;
    expiry?: string;
    fullname: string;
    instrument?: string;
    mode?: string;
    state: string;
    status: boolean;
    type: string;
    synced: boolean;
    reference?: string;
    createdAt: string;
    updatedAt: string;

    index?: number;
    isNew?: boolean;
    isLoading?: boolean;


    /**
     * Constructor
     * @param record
     * @param index 
     */
    constructor(record?: any, index?: number) {
        this.id = record.id;
        this.accountName = record.account_name;
        this.address1 = record.address_1;
        this.address2 = record.address_2 || null;
        this.city = record.city;
        this.country = record.country;
        this.countryCode = record.country_code;
        this.expiry = record.expiry || null;
        this.fullname = record.full_name;
        this.instrument = record.instrument;
        this.mode = record.mode;
        this.state = record.state;
        this.type = record.type;
        this.zipCode = record.zip_code;
        this.status = record.status;
        this.synced = record.synced || false;
        this.reference = record.reference;
        this.createdAt = record.created_at;
        this.updatedAt = record.updated_at;

        this.index = index || 0;
        this.isNew = false;
        this.isLoading = false;
    }

    /**
     * Update status
     * @param val 
     */
    setStatus(val: boolean): void {
        this.status = val;
    }
    
    setUpdateStamp(): void {
        this.updatedAt = DateTimeHelper.now().toString();
    }
}