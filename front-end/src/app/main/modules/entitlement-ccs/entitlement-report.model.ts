import * as _ from 'lodash';
import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';

export class EntitlementReport {

    // serviceID: string;
    enrolmentID: string;
    childName: string;
    CCSPercentage: string;
    CCSTotalHoursPerFortnight: string;
    apportionedHoursPerFortnight: string;
    ACCSHourlyRateCapIncreasePercentage: string;
    annualCapReached: string;
    absenceCount: string;
    CCSWithholdingPercentage: string;
    dateOfEntitlement: string;
    preschoolExemption: string;

    /**
     * Constructor
     *
     * @param {*} [entitlement]
     * @param {number} [index]
     */
    constructor(entitlement?: any, index?: number)
    {
        // this.serviceID = entitlement.serviceID || '';
        this.enrolmentID = entitlement.enrolmentID || '';
        this.childName = entitlement.childName || '';
        this.dateOfEntitlement = entitlement.dateOfEntitlement || '';
        this.CCSPercentage = entitlement.CCSPercentage || '';
        this.CCSWithholdingPercentage = entitlement.CCSWithholdingPercentage || '';
        this.CCSTotalHoursPerFortnight = entitlement.CCSTotalHoursPerFortnight || '';
        this.apportionedHoursPerFortnight = entitlement.apportionedHoursPerFortnight || '';
        this.ACCSHourlyRateCapIncreasePercentage = entitlement.ACCSHourlyRateCapIncreasePercentage || '';
        this.annualCapReached = entitlement.annualCapReached || '';
        this.absenceCount = entitlement.absenceCount || '';
        this.preschoolExemption = entitlement.preschoolExemption || '';
    }


    TimeTransform(value: number, type: string): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return '--:--';
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';

        return `${h}:${m} ${a}`;
    }
}
