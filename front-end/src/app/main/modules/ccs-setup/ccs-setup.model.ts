import { ProviderSetup } from "../account-manager/provider-setup/models/provider-setup.model";

export class CcsSetup {
    
    id: string;
    orgId: string;
    activationCode?: string;
    deviceName?: string;
    PRODAOrgId?: string;
    personId?: string;
    index?: number;

    keyStatus?: string;
    deviceStatus?: string;
    keyExpire?: string;
    deviceExpire?: string;
    status?: string;

    isNew?: boolean;
    isLoading?: boolean;
    statusLoading?: boolean;
    disabled?: boolean;
    expired?: string;

    providers?: ProviderSetup[];

    /**
     * Constructor
     *
     * @param ccs
     */
    constructor(ccs?: any, index?: number) {
        this.id = ccs.id;
        this.orgId = ccs.organization_id;
        this.deviceName = ccs.device_name;
        this.PRODAOrgId = ccs.PRODA_org_id;
        this.personId = ccs.person_id;
        this.keyStatus = ccs.key_status;
        this.deviceStatus = ccs.device_status;
        this.keyExpire = ccs.key_expire;
        this.deviceExpire = ccs.device_expire;
        this.status = ccs.status;
        this.activationCode = ccs.activation_code;
        this.expired = ccs.expired === true ? '1' : '0';

        this.providers = ccs.providers ? ccs.providers.map((i: any, idx: number) => new ProviderSetup(i)) : [];

        this.isNew = false;
        this.isLoading = false;
        this.statusLoading = false;
        this.disabled = false;
        this.index = index || 0;
    }

    /**
     * update branch status
     *
     * @param {boolean} value
     * @memberof Ccs
     */
    setStatus(value: string): void {
        this.status = value;
    }

    /**
     * update branch disable|selected status
     *
     * @param {boolean} value
     * @memberof Ccs
     */
    //    setDisableStatus(value: boolean): void {
    //        this.disabled = value;
    //    }

    getExpiredLabel(): string {
        return (
            '<img src="assets/icons/flat/ui_set/custom_icons/' +
            (this.expired === '0' ? 'checked.svg' : 'cancel.svg') +
            '" class="table-svg-icon"/>'
        );
    }
}
