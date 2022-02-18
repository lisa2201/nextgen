
export class AddFinancialStatementListItem {

    id: string;
    key: string;
    title: string;
    previewLoading: boolean;
    sendLoading: boolean;
    downloadLoading: boolean;

    sendDone: boolean;
    previewDone: boolean;
    
    index?: number;
    disabled?: boolean;

    constructor(item?: any, index?: number) {

        this.id = item.id;
        this.key = item.key;
        this.title = item.title;

        this.sendLoading = false;
        this.previewLoading = false;
        this.previewDone = false;
        this.downloadLoading = false;
        this.sendDone = false;
        this.index = index || 0;

    }

    loadPreview(value: boolean): void {
        this.previewLoading = value;
    }

    loadSend(value: boolean): void {
        this.sendLoading = value;
    }

    loadDownload(value: boolean): void {
        this.downloadLoading = value;
    }

    setPreviewStatus(value: boolean): void {
        this.previewDone = value;
    }
    
    setSendStatus(value: boolean): void {
        this.sendDone = value;
    }
}
