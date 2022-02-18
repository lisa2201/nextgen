import { AppConst } from 'app/shared/AppConst';

import * as _ from 'lodash';

export class ChildCulturalDetails {

    id: string;
    ab_or_tsi: string;
    cultural_background: string;
    language: string;
    religious_requirements_chk: string;
    cultural_requirements: string;
    cultural_requirements_chk: string;
    religious_requirements: string;

    /**
     * Constructor
     *
     * @param cultural
     */
    constructor(cultural?: any, index?: number)
    {
        this.id = cultural.id || null;
        this.ab_or_tsi = cultural.ab_or_tsi || null;
        this.cultural_background = cultural.cultural_background || null;
        this.language = cultural.language || null;
        this.cultural_requirements_chk = cultural.cultural_requirements_chk || null;
        this.cultural_requirements = cultural.cultural_requirements || null;
        this.religious_requirements_chk = cultural.religious_requirements_chk || null;
        this.religious_requirements = cultural.religious_requirements || null;

    }

}
