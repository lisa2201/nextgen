import * as _ from 'lodash';
export interface Field {
    isSaved: boolean;
    name: string;
    res: string;
}
export class ReportModel {

    id: string;
    name: string;
    masterType: string;
    reportType: string;
    field: Field[];
    isFav: boolean;
    index?: number;
    isDefault? : boolean;

    /**
     * Constructor
     * 
     * @param {*} [booking]
     * @param {number} [index]
     */
    constructor(report?: any, index?: number) 
    {
        this.id = report.index || '';
        this.name = report.name || '';
        this.masterType = report.master_type || '';
        this.reportType = report.report_type || '';
        this.field = report.field || '';
        this.isFav = report.isFav === '0' ? false : true || false;
        this.isDefault = this.getReportType(report.report_type);
        this.index = index || 0;
        
    }

    getReportType?(type):boolean {

        return (/[a-z]/.test(type)) ? false : true;
    }

}