export class CertificateOrDetermination {
    id: string;
    child: number;
    type: string;
    certificateOrDeterminationApiData: any;
    stateTerritoryData: any;
    isSynced: any;
    syncerror: any;
    dhscorrelationid: string;
    riskReasons: string[];
    determinationID: string;
    StateTerritory: any;
    certificateID: string;
    childNoLonerAtRisk: boolean;
    status: string;
    draft: any;
    SupportingDocuments: any;
    certificateStartDate: string;
    determinationStartDate: string;
    child_no_longer_at_risk_data: any;
    cancel_reason: string;
    extensionReasons: string[];

    /**
     * Constructor
     *
     * @param emergency
     */
    constructor(certificate?: any)
    {
        this.id = certificate.id;
        this.child = certificate.child_profile_id;
        this.type = certificate.type;
        this.certificateOrDeterminationApiData = certificate.certificate_or_determination_api_data;
        this.stateTerritoryData = certificate.state_territory_data;
        this.isSynced = certificate.is_synced;
        this.syncerror = certificate.syncerror;
        this.dhscorrelationid = certificate.dhscorrelationid;
        this.riskReasons = certificate.riskReasons;
        this.certificateID = certificate.certificate_or_determination_id;
        this.determinationID = certificate.certificate_or_determination_id;
        this.childNoLonerAtRisk = certificate.childNoLonerAtRisk;
        this.status = (certificate.status) ? certificate.status : null;
        this.draft = (certificate.draft) ? certificate.draft : null;
        this.extensionReasons = certificate.extensionReasons ? certificate.extensionReasons : [];
    }

    /*public getRiskReasons(): any{
        for (const key in this.certificateOrDeterminationApiData.RiskReasons){
                this.riskReasons.push(this.certificateOrDeterminationApiData.RiskReasons[key]['reason']);
        }
        return this.riskReasons;
    }*/
}
