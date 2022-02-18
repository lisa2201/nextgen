export class CorrenpondenceList {
    public id: string;
    public dateTime?: string;
    public providerId?: string;
    public serviceId?: string;
    public size?: string;
    public type?: string;
    public date?: string;
    public link?: string;
    public subject?: string;

    constructor(correspondence?: any) {
        this.id = correspondence.id;
        this.dateTime = correspondence.dateTime;
        this.providerId = correspondence.providerID;
        this.serviceId = correspondence.serviceID;
        this.date = correspondence.date;
        this.link = correspondence.link;
        this.subject = correspondence.subject;
        this.size = correspondence.size;
        this.type = correspondence.MIMEType;
    }

    getFullLink(): string {
        return this.link.substring(1, this.link.length - 1);
        // return this.link.slice(1, -1);

        //  return this.link.slice(1, -1);
    }

    getFileTypeIcon(): string {
        try {
            return (
                '<img src="assets/icons/flat/ui_set/files-types/svg/' +
                (this.type === 'PDF' ? 'pdf.svg' : 'txt.svg') +
                '" class="table-svg-icon"/>'
            );
            // return this.type === 'PDF' ?'assets/icons/flat/ui_set/files-types/svg/pdf.svg' : 'assets/icons/flat/ui_set/files-types/svg/txt.svg';
        } catch (err) {
            return '';
        }
    }
}
