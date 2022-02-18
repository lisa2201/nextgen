export class PasswordSetupVerify 
{
    id: string;
    email: string;
    firstName:string;
    lastName: string;
    isinvitationExpired: boolean;
    isEmailVarified: boolean;
    isLoged: boolean;
    /**
     * Constructor
     *
     * @param invitation
     */
    constructor(invitation?: any)
    {
        this.id = invitation.id;
        this.email = invitation.email || '';
        this.firstName = invitation.first_name;
        this.lastName = invitation.last_name;
        this.isinvitationExpired = invitation.is_expire_invitation;
        this.isEmailVarified = invitation.email_verified;
        this.isLoged = invitation.is_loged;

    }

    /**
     * get page icon
     *
     * @returns {string}
     */
    getPageIcon(): string
    {
        return 'assets/icons/flat/ui_set/custom_icons/family.svg';
    }
}
