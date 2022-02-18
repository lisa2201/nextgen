export class EnrolmentEntitlement {

    serviceId: string;
    enrolmentId: string;
    
    percentage: string;
    totalHoursPerFortnight: string;
    apportionedHoursPerFortnight: string;
    hourlyRateCapIncreasePercentage: string;
    annualCapReached: string;
    absenceCount: string;
    withholdingPercentage: string;
    dateOfEntitlement: string;
    preschoolExemption: string;
    paidAbsences: string;
    unpaidAbsences: string;
    absencesAvailableNoEvidence: string;
    
    isLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [entitlement]
     * @param {number} [index]
     */
    constructor(entitlement?: any, index?: number)
    {
        this.serviceId = entitlement.serviceID || '';
        this.enrolmentId = entitlement.enrolmentID || '';

        this.percentage = entitlement.CCSPercentage || '';
        this.totalHoursPerFortnight = entitlement.CCSTotalHoursPerFortnight || '';
        this.apportionedHoursPerFortnight = entitlement.apportionedHoursPerFortnight || '';
        this.hourlyRateCapIncreasePercentage = entitlement.ACCSHourlyRateCapIncreasePercentage || '';
        this.annualCapReached = entitlement.annualCapReached || '';
        this.absenceCount = entitlement.absenceCount || '';
        this.withholdingPercentage = entitlement.CCSWithholdingPercentage || '';
        this.dateOfEntitlement = entitlement.dateOfEntitlement || '';
        this.preschoolExemption = entitlement.preschoolExemption || '';
        this.paidAbsences = entitlement.paidAbsences || '';
        this.unpaidAbsences = entitlement.unpaidAbsences || '';
        this.absencesAvailableNoEvidence = entitlement.absencesAvailableNoEvidence || '';
        
        this.isLoading = false;
        this.index = index || 0;
    }

    /**
     * get preschool exemption label
     *
     * @returns {string}
     */
    getPreschoolExemptionLabel(): string
    {
        return (this.preschoolExemption !== '') ? ((this.preschoolExemption) === 'N' ? 'No' : 'Yes') : 'N/A';
    }
}
