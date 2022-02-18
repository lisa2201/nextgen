import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FinanceReportservice } from '../../../service/finance-report.service';

@Component({
    selector: 'app-finance-report-user-filter-right-sidenav',
    templateUrl: './finance-report-user-filter-right-sidenav.component.html',
    styleUrls: ['./finance-report-user-filter-right-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceReportUserFilterRightSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    filterForm: FormGroup;
    loading: boolean;

    formDefaultValues: any;

    constructor(
        private _financeReportService: FinanceReportservice,
        private _logger: NGXLogger,
        private _fuseSidebarService: FuseSidebarService
    ) {
        // Set defaults
        this.loading = false;
        this.filterForm = this.createFilterForm();

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

        this._financeReportService.onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._financeReportService.onUserLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {
                this.loading = value;

                if (!value) {
                    const sidebar = this._fuseSidebarService.getSidebar('finance-report-user-right-sidebar');

                    if (sidebar.opened) {
                        sidebar.toggleOpen();
                    }
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
        return this.filterForm.controls;
    }

    get getFormValues(): any {
        return {
            primary_payer: this.fc.primary_payer.value,
            parent_status: this.fc.parent_status.value
        };
    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            primary_payer: new FormControl('yes'),
            parent_status: new FormControl('0')
        });
    }

    filter(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const values = this.getFormValues;

        this._financeReportService.onFilterChanged.next(values);

    }

}
