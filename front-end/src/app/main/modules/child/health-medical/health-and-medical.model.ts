import * as _ from 'lodash';

export class HealthAndMedical 
{

    id: string;
    child_id: string;
    ref_no: string;
    medicare_expiry_date: string;
    ambulance_cover_no: string;
    health_center: string;
    service_name: string;
    service_phone_no: string;
    service_address: string;
    /**
     * Constructor
     * 
     * @param {*} [invitation]
     * @param {number} [index]
     */
    constructor(medicalInfo?: any, index?: number)
    {
        this.id = medicalInfo['id'];
        this.child_id = medicalInfo.child_id || '';
        this.ref_no = medicalInfo.ref_no || '';
        this.medicare_expiry_date = medicalInfo.medicare_expiry_date || '';
        this.ambulance_cover_no = medicalInfo.ambulance_cover_no || '';
        this.health_center = medicalInfo.health_center || '';
        this.service_name = medicalInfo.service_name || '';
        this.service_phone_no = medicalInfo.service_phone_no || '';
        this.service_address = medicalInfo.service_address || '';
  
    }

 
}
