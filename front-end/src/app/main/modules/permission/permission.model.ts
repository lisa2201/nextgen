export class Permission
{
    id: string;
    name: string;
    desc: string;
    type?: string;
    group?: string;
    groupName?: string;
    attrId?: string;
    created?: string;
    canEditable?: boolean;
    isParent?: boolean;

    navReference?: string;
    slug?: string;
    file?: string;
    
    isNew?: boolean;
    isUpdate?: boolean;
    isLoading?: boolean;
    isSelected?: boolean;
    index?: number;

    /**
     * Constructor
     * 
     * @param {*} [permission]
     * @param {number} [index]
     */
    constructor(permission?: any, index?: number)
    {
        this.id = permission.id || '';
        this.name = permission.name || '';
        this.desc = permission.description || '';
        this.attrId = permission.attr_id || '';
        this.type = permission.type || '';
        this.group = permission.level || '';
        this.groupName = permission.gname || '';
        this.created = permission.cdate || '';
        this.canEditable = permission.isedit || false;
        this.isParent = permission.is_parent || false;
        //
        this.navReference = permission.nav_ref || null;
        this.slug = permission.slug || null;
        this.file = permission.file || null;
        //
        this.isNew = false;
        this.isUpdate = false;
        this.isLoading = false;
        this.isSelected = false;
        this.index = index || 0;
    }

    /**
     * can editable
     */
    isEditable(): boolean
    {
        return this.canEditable;
    }

    /**
     * set selected status
     * @param value 
     */
    setSelectedStatus(value: boolean): void
    {
        this.isSelected = value;
    }

    /**
     * set file name
     * @param value 
     */
    setFileName(value: string): void
    {
        this.file = value;
    }
}
