import * as _ from 'lodash';
import { User } from '../user/user.model';

export class StaffIncident {

    id?: string;
    staff?: User;    
    date?: string;
    time?: number;

    recordedPerson?: string;
    recordedPersonSignature?: string;
    recordedDate?: string;
    recordedTime?: number;
    witnessPerson?: string;
    witnessSignature?: string;        
    incidentCircumstances?: string;
    incidentEquipments?: string;
    incidentLocation?: string;
    incidentActionTaken?: string;
    notificationParent?: string;
    notificationParentDate?: string;
    notificationParentTime?: number;
    notificationParentContacted?: boolean;
    notificationSupervisor?: string;
    notificationSupervisorDate?: string;
    notificationSupervisorTime?: number;
    notificationSupervisorContacted?: boolean;
    notificationOfficer?: string;
    notificationOfficerDate?: string;
    notificationOfficerTime?: number;
    notificationOfficerContacted?: boolean;
    notificationMedical?: string;
    notificationMedicalDate?: string;
    notificationMedicalTime?: number;
    notificationMedicalContacted?: boolean;
    transportedByAmbulance?: boolean;
    excludedFromshifts?: boolean;
    notifiedToAuthorities?: boolean;
    recommendedLeave?: string;
    medicalCertificateProvided?: boolean;
    medicalCertificateSubmitted?: boolean;
    supervisor?: string;
    supervisorSignature?: string;
    supervisedDate?: string;
    supervisorComments?: string;
    staffid?: string;
    images?: string[];

    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [incident]
     * @param {number} [index]
     */
    constructor(incident?: any, index?: number) 
    {
        this.id = incident.id || '';   
        this.staff = (incident.staff && !_.isNull(incident.staff)) ? new User(incident.staff) : null;        
        this.date = incident.date || '';
        this.time = incident.time || '';
        this.recordedPerson = incident.person_completing.recordedPerson || '';
        this.recordedPersonSignature = incident.person_completing.recordedPersonSignature || '';
        this.recordedDate = incident.person_completing.recordedDate || '';
        this.recordedTime = incident.person_completing.recordedTime || '';
        this.witnessPerson = incident.witness_details.witnessPerson || '';
        this.witnessSignature = incident.witness_details.witnessSignature || '';
        this.incidentCircumstances = incident.incident_details.incidentCircumstances || '';
        this.incidentEquipments = incident.incident_details.incidentEquipments || '';
        this.incidentLocation = incident.incident_details.incidentLocation || '';
        this.incidentActionTaken = incident.incident_details.incidentActionTaken || '';
        this.notificationParent = incident.notifications.notificationParent || '';
        this.notificationParentDate = incident.notifications.notificationParentDate || '';
        this.notificationParentTime = incident.notifications.notificationParentTime || '';
        this.notificationParentContacted = incident.notifications.notificationParentContacted || false;
        this.notificationSupervisor = incident.notifications.notificationSupervisor || '';
        this.notificationSupervisorDate = incident.notifications.notificationSupervisorDate || '';
        this.notificationSupervisorTime = incident.notifications.notificationSupervisorTime || '';
        this.notificationSupervisorContacted = incident.notifications.notificationSupervisorContacted || false;
        this.notificationOfficer = incident.notifications.notificationOfficer || '';
        this.notificationOfficerDate = incident.notifications.notificationOfficerDate || '';
        this.notificationOfficerTime = incident.notifications.notificationOfficerTime || '';
        this.notificationOfficerContacted = incident.notifications.notificationOfficerContacted || false;
        this.notificationMedical = incident.notifications.notificationMedical || '';
        this.notificationMedicalDate = incident.notifications.notificationMedicalDate || '';
        this.notificationMedicalTime = incident.notifications.notificationMedicalTime || '';
        this.notificationMedicalContacted = incident.notifications.notificationMedicalContacted || false;
        this.transportedByAmbulance = incident.notifications.transportedByAmbulance || false;
        this.excludedFromshifts = incident.notifications.excludedFromshifts || false;
        this.notifiedToAuthorities = incident.notifications.notifiedToAuthorities || false;
        this.recommendedLeave = incident.notifications.recommendedLeave || '';
        this.medicalCertificateProvided = incident.followup_requirments.medicalCertificateProvided || false;
        this.medicalCertificateSubmitted = incident.followup_requirments.medicalCertificateSubmitted || false;
        this.supervisor = incident.supervisors_acknowledgement.supervisor || '';
        this.supervisorSignature = incident.supervisors_acknowledgement.supervisorSignature || '';
        this.supervisedDate = incident.supervisors_acknowledgement.supervisedDate || '';
        this.supervisorComments = incident.supervisors_acknowledgement.supervisorComments || '';
        this.images = incident.images || [];
        
        // this.isLoading = false;
        this.index = index || 0;
    }

}
