import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import { Location } from '@angular/common';
import { InnovativeSolutionCasesService } from '../service/innovative-solution-cases.service';


@Component({
  selector: 'innovative-detail-view',
  templateUrl: './detail-view.component.html',
  styleUrls: ['./detail-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InnovativeSolutionCasesDetailViewComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;

    caseListDetails: any;
    days: [];
    careHours: [];
    supportHours: [];
    isEnrolments: [];

    clearService: boolean;

    constructor(
        private _innovativeSolutionCaseService: InnovativeSolutionCasesService,
        private _location: Location,
        private _logger: NGXLogger
    ) {
        this._unsubscribeAll = new Subject();
        this.clearService = true;

        this.caseListDetails = null;
        this.days = [];
        this.careHours = [];
        this.supportHours = [];
        this.isEnrolments = [];
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('[innovative Case list view]');
        this._innovativeSolutionCaseService.onCaseDetailChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {
                this._logger.debug('[innovative Case response]', response);
                this.caseListDetails = response;                
                
                this._logger.debug('[innovative Case]', this.caseListDetails);

                
            });

    }

    /**
     * On destroy
     */
    // tslint:disable-next-line: use-lifecycle-interface
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        if (this.clearService) {
            this._logger.debug('Reset IS Case Service Data');
            this._innovativeSolutionCaseService.unsubscribeOptions();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------


    onBack(e: MouseEvent): void {
        e.preventDefault();
        this.clearService = false;
        this._location.back();
    }


}
