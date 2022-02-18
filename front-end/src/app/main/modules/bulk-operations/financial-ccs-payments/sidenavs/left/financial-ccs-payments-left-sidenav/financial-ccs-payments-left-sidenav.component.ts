import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { FinancialCcsPaymentsService } from '../../../services/financial-ccs-payments.service';
import { NGXLogger } from 'ngx-logger';
import * as moment from 'moment';
import { takeUntil, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Papa } from 'ngx-papaparse';
import { CsvService } from 'app/shared/service/csv.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

@Component({
    selector: 'app-financial-ccs-payments-left-sidenav',
    templateUrl: './financial-ccs-payments-left-sidenav.component.html',
    styleUrls: ['./financial-ccs-payments-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialCcsPaymentsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    ccsPaymentsFilterForm: FormGroup;
    tableLoader: boolean;
    queryLoader: boolean;
    downloadLoader: boolean;
    sideBarName: string;

    /**
     * constructor
     * @param {BalanceAdjustmentsService} _balanceAdjustmentsService 
     * @param {NGXLogger} _logger 
     */
    constructor(
        private _financialCcsPaymentsService: FinancialCcsPaymentsService,
        private _logger: NGXLogger,
        private _csvParser: Papa,
        private _csvService: CsvService,
        private _sidebarService: FuseSidebarService
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.ccsPaymentsFilterForm = this.createFilterForm();
        this.tableLoader = false;
        this.downloadLoader = false;
        this.queryLoader = false;
        this.sideBarName = 'finance-ccs-payments-sidebar';

        this.setFilterFormDefaults();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('finance accounts left side nav!!!');

        // Subscribe to filter changes
        this.ccsPaymentsFilterForm
            .get('start_date')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                
                this.ccsPaymentsFilterForm.get('end_date').patchValue(null, {emitEvent: false});

            });

        this._financialCcsPaymentsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.tableLoader = value;
                this.queryLoader = value;

                if (!value) {
                    this.checkSidebar();
                }
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    get fc(): any {
        return this.ccsPaymentsFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            document_number: this.fc.document_number.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            start_date: new FormControl(null),
            end_date: new FormControl(null),
            document_number: new FormControl(null)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.ccsPaymentsFilterForm.get('start_date').patchValue(null, { emitEvent: false });
        this.ccsPaymentsFilterForm.get('end_date').patchValue(null, { emitEvent: false });
        this.ccsPaymentsFilterForm.get('document_number').patchValue(null, { emitEvent: false });
    }

    disabledEndDate = (date: Date): boolean => {

        return moment(date).isSameOrBefore(moment(this.fc.start_date.value)) || moment(date).isAfter(moment(this.fc.start_date.value).add(90, 'days'));

    }

    queryData(event: MouseEvent): void {

        event.preventDefault();
        
        this._financialCcsPaymentsService.onFilterChanged.next(this.getFormValues);

    }

    checkSidebar(): void {
        if (this._sidebarService.getSidebar(this.sideBarName).opened) {
            this._sidebarService.getSidebar(this.sideBarName).toggleOpen();
        }
    }

    downloadCsv(event: MouseEvent): void {

        event.preventDefault();

        this.downloadLoader = true;
    
        this._financialCcsPaymentsService.downloadCsv(this.getFormValues)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.downloadLoader = false;
                    this.checkSidebar();
                })
            )
            .subscribe((response) => {

                this._csvService.downLoadCsvFile(this._csvParser.unparse(response), 'CCS-Payment-Export');
                
            });

    }

}
