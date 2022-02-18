import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { AppConst } from '../AppConst';
import * as jsPDF from 'jspdf'
import 'jspdf-autotable'
import { NotifyType } from '../enum/notify-type.enum';
import { NotificationService } from './notification.service';

@Injectable({
    providedIn: 'root'
})
export class CsvService {

    ignoreLoadingHeaders: HttpHeaders;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {HttpClient} _httpClient
     */
    constructor(
        private _logger: NGXLogger,
        private _httpClient: HttpClient,
        private _notification: NotificationService,
    )
    {
        // Set defaults
        this.ignoreLoadingHeaders = new HttpHeaders({ 'ignoreProgressBar': '' });
    }


    downLoadCsvFile(csvData, heading): any{
        try
        {
            const blob = new Blob([csvData], {type: 'text/csv'});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', heading+this.getCurrentDate()+'.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        }
        catch (err)
        {
            setTimeout(() => this._notification.displaySnackBar('error while building report', NotifyType.ERROR), 200);
            return;
        }
    }

    getCurrentDate():any {
        const currentdate = new Date();
        return  currentdate.getDate() + '/' + (currentdate.getMonth() + 1) + '/' + currentdate.getFullYear();
    }



}
