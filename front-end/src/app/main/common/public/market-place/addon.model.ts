export interface Addon {

    id: number;
    title: string;
    description: string;
    price: number;
    custom: boolean;
    imageUrl: string;
    properties: object;
    split_pricing: boolean;
    trial_period?: number;
    plugin: boolean;
    country: string;
    unit_type?: string;
    minimum_price?: number

}
