import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { InnovativeSolutionCasesClaimsService } from '../service/innovative-solution-case-claims.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'innovative-case-claims-details-view',
  templateUrl: './case-claims-details-view.component.html',
  styleUrls: ['./case-claims-details-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InnovativeCaseClaimsDetailsViewComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;

    caseListDetails: any;

    payment: [];

    clearService: boolean;

    constructor(
        private _innovativeSolutionCaseClaimsService: InnovativeSolutionCasesClaimsService,
        private _location: Location,
        private _logger: NGXLogger,
        private _router: Router,
    ) {
        this._unsubscribeAll = new Subject();
        this.clearService = true;

        this.caseListDetails = null;
        this.payment = [];
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._innovativeSolutionCaseClaimsService.onCaseClaimsDetailChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {

                this.caseListDetails = response;
                if (response.ListOfPayments &&  response.ListOfPayments.Payment) {
                    this.payment = response.ListOfPayments.Payment;
                }
                else {
                    this.payment = [];
                }
                              
                this._logger.debug('[innovative Case claims]', this.caseListDetails);

                
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        if (this.clearService) {
            this._logger.debug('Reset IS Case claims Service Data');
            this._innovativeSolutionCaseClaimsService.unsubscribeOptions();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------


    onBack(e: MouseEvent): void {
        e.preventDefault();
        this.clearService = false;

        this._router.navigate(['innovative-solution-cases-claims']);

        // this._location.back();
    }


}
