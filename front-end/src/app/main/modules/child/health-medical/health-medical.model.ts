import * as _ from 'lodash';

export class HealthMedical 
{

    type: string;
    description: string;
    id: string;
    isLoading?: boolean;

    /**
     * Constructor
     * 
     * @param {*} [invitation]
     * @param {number} [index]
     */
    constructor(allergy?: any, index?: number)
    {
        this.id = allergy.id;
        this.type = allergy.type || '';
        this.description = allergy.description || '';
        this.isLoading = false;
  
    }

 
}
