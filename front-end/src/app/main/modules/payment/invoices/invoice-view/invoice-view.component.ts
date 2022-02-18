import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { fuseAnimations } from '@fuse/animations';
import { SubscriberInvoice } from '../models/invoice.model';
import { Location } from '@angular/common';
import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'app-invoice-view',
    templateUrl: './invoice-view.component.html',
    styleUrls: ['./invoice-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations
    ]
})
export class InvoiceViewComponent implements OnInit, OnDestroy {

    invoice: SubscriberInvoice;
    taxValue: number;

    /**
     * Constructor
     * @param {ActivatedRoute} _route 
     */
    constructor(
        private _route: ActivatedRoute,
        private _location: Location,
        private _logger: NGXLogger
    ) {
        
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.invoice = this._route.snapshot.data['resolveData'];

        this._logger.debug('[Invoice]', this.invoice);

        this.taxValue = (this.invoice.subTotal / 100) * this.invoice.organization.taxPercentage;

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    goBack(event: MouseEvent): void {
        event.preventDefault();
        this._location.back();
    }


}
