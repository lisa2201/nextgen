export class Role
{
    id: string;
    display: string;
    group: string;
    type: string;

    attrId?: string;
    created?: string;
    color?: string;
    desc?: string;
    isDeleted?: boolean;
    canEditable?: boolean;
    name?: string;
    orgId?: string;
    orgName?: string;
    sDelete?: boolean;
    permissions?: string[];
    hasAdminPrivileges?: boolean;

    isNew?: boolean;
    isLoading?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [role]
     * @param {number} [index]
     */
    constructor(role?: any, index?: number)
    {
        this.id = role.id;
        this.attrId = role.attr_id;
        this.group = role.group;
        this.type = role.type;

        this.created = role.cdate || null;
        this.color = role.color || null;
        this.desc = role.desc || null;
        this.display = role.display || null;
        this.isDeleted = role.isdel || null;
        this.canEditable = role.isedit || null;
        this.name = role.name || null;
        this.orgId = role.org || null;
        this.orgName = role.org_name || null;
        this.sDelete = role.sdelete || false;
        this.permissions = role.selectedPrems || [];
        this.hasAdminPrivileges = role.is_admin || false;
        //
        this.isNew = false;
        this.isLoading = false;
        this.index = index || 0;
    }

    /**
     * can editable
     */
    isEditable(): boolean
    {
        return this.canEditable;
    }
}
