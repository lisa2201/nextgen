import * as _ from 'lodash';

export class OrganizationSubscription 
{
    id: string;
    organizationId: string;
    addon_id: string;
    title: string;
    description: string;
    price: string;
    unitType: string;
    minimumPrice: number;
    properties: JSON;
    status: boolean;
   
    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
  
   /**
    * 
    * @param {any} organization 
    */
    constructor(organization?: any)
    {
        this.id = organization.id;
        this.title = organization.title;
        this.description = organization.description;
        this.price = organization.price;
        this.unitType = organization.unit_type;
        this.minimumPrice = organization.minimum_price;
        this.properties = organization.properties;
        this.status = organization.status;
        this.organizationId = organization.organization_id;
        this.addon_id = organization.addon_id;
       
        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
    }





















   
    // getCityLabel(): string
    // {
    //     return this.city != '' ? this.city : '<span class="label-tag md-orange-600 txt-w">None</span>';
    // }

    // /**
    //  * formate role list label
    //  *
    //  * @returns {string}
    //  */
    // getRolesLabel(): string
    // {
    //     let roleLabel = '';

    //     if (this.roles.length > 0)
    //     {
    //         _.forEach(this.roles, function (value)
    //         {
    //             roleLabel += '<span class="label-tag ' + ((value.color != null) ? value.color : 'md-grey-500') + '">' + _.capitalize(value.name) + '</span>';
    //         });
    //     }
    //     else
    //     {
    //         roleLabel += '<span class="label-tag md-orange-600 txt-w">None</span>';
    //     }

    //     return roleLabel;
    // }

    // /**
    //  * formate expiry label
    //  *
    //  * @returns {string}
    //  */
    // getExpiredLabel(): string
    // {
    //     return '<img src="assets/icons/flat/ui_set/custom_icons/' + ((this.expired) ? 'checked.svg' : 'cancel.svg') + '" class="table-svg-icon"/>'
    // }

}
