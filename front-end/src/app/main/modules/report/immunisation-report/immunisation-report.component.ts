import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ImmunisationMatrixData, ImmunisationReportservice } from '../service/immunisation-report.service';

@Component({
    selector: 'app-immunisation-report',
    templateUrl: './immunisation-report.component.html',
    styleUrls: ['./immunisation-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationReportComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    immunisationTable: ImmunisationMatrixData[];
    buttonValidator: boolean;
    
    viewLoading: boolean;
    constructor(
        private _immunisationReportService: ImmunisationReportservice,
        private _notification: NotificationService,
    ) {
        this._unsubscribeAll = new Subject();
        this.viewLoading = false;
        this.immunisationTable = [];
        this.buttonValidator = false;
    }

    ngOnInit() {

        this._immunisationReportService
            .onMatrixDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: ImmunisationMatrixData[]) => {
                this.immunisationTable = data;

                this.buttonValidator = this.immunisationTable.filter(v=> v.isAllChecked).length === this.immunisationTable.length ? true : false;
            });

        // Subscribe to table loader
        this._immunisationReportService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {

                this.viewLoading = value;
            });
    }

    bulkUpdate(e: MouseEvent): Promise<any> {

        e.preventDefault();
        return new Promise((resolve, reject) =>
        {

            // this.viewLoading = true;
            this._immunisationReportService.bulkUpdate()
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        
                        resolve(null);
                    })
                )
                .subscribe(
                    message =>
                    {
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    },
                    error =>
                    {
                        reject(error);
                    }
                );
            
        });
    }

}
