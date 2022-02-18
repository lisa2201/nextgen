export class CcsEntitlementModel{
   /* public id: string;
    public dateTime?: string;
    public providerId?: string;
    public serviceId?: string;
    public source?: string;
    public sourceId?: number;

    public type?: string;
    public desc?: string;
    public subject?: string;*/

    public enrolmentId: string;
    public date: string;
    public ccsPercentage: string;
    public ccsWithholdingPercentage: string;
    public ccsTotalHours: number
    public apportionedHours: number;
    public accsHourlyRateCapIncrease: string
    public annualCapReached: string;
    public absenceCount: number;
    public preSchoolExcemption: string;
    public child: any;
    public childName: string;
    public previous: object;
    public oldCCSPercentage: string;
    public oldCCSHours: string;

    constructor(message?: any) {
        this.enrolmentId = message.enrolment_id;
        this.date = message.date;
        this.ccsPercentage = message.ccs_percentage;
        this.ccsWithholdingPercentage = message.ccs_withholding_percentage;
        this.ccsTotalHours = message.ccs_total_hours;
        this.apportionedHours = message.apportioned_hours;
        this.accsHourlyRateCapIncrease = message.accs_hourly_rate_cap_increase;
        this.annualCapReached = message.annual_cap_reached;
        this.absenceCount = message.absence_count;
        this.preSchoolExcemption = message.pre_school_excemption;
        this.child = message.child;
        this.childName = (message.child) ? message.child.first_name + ' ' + message.child.last_name: null;
        this.previous = (message.previous) ? message.previous : null;
        this.oldCCSPercentage = (message.previous) ? message.previous.ccs_percentage : null;
        this.oldCCSHours= (message.previous) ? message.previous.ccs_total_hours : null;
    }

}
