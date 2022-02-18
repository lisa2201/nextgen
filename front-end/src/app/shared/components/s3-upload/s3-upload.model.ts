export interface UploadListConfig {
    showPreviewIcon: boolean;
    showRemoveIcon: boolean;
    showDownloadIcon: boolean;
}

export interface FileHashMap {
    key: string;
    uid: string;
}

export interface FileListItem {
    key: string;
    file?: File;
    bucket: string;
}