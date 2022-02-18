import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { HomeService } from 'app/main/modules/home/services/home.service';

@Component({
    selector: 'widget-parent-payment',
    templateUrl: './widget-parent-payment.component.html',
    styleUrls: ['./widget-parent-payment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WidgetParentPaymentComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    selectedChild: any;    
    payment_amount: string;
    
    widgetLoader: boolean;

    @Input() show_child_select: boolean;
    @Input() children: any[];
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _homeService: HomeService,
    )
    {
        // set default values
        this.widgetLoader = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.show_child_select = false;
        this.payment_amount = '0.00';      
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {

        setTimeout(() => this.getDailyPaymets(), 250);

    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.getDailyPaymets(), 250);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * get daily bookings
     */    
    getDailyPaymets(childid: string = ''): void
    {
        this.widgetLoader = true;

        this._homeService.getPayments(childid)
        .pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => this.widgetLoader = false)
        )
        .subscribe(
            response=> 
            {
                this.payment_amount = response;
            },
            error =>
            {
                throw error;
            }
        ); 
    }
   
}
