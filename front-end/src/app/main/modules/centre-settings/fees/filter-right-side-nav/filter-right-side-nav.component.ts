import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as _ from 'lodash';
import { FeesService } from '../service/fees.service';

@Component({
    selector: 'fees-filter-right-side-nav',
    templateUrl: './filter-right-side-nav.component.html',
    styleUrls: ['./filter-right-side-nav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FeesFilterRightSideNavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    feesFiltersForm: FormGroup;
    formDefaultValues = {
        status: '1'
    };
    isFilterChange: boolean;
    radioValue = 'A';

    constructor(private _logger: NGXLogger, private _feesService: FeesService) {
        this.feesFiltersForm = this.createFilterForm();
        this.isFilterChange = false;
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void 
    {
        this._logger.debug('ccs left side nav!!!');
        
        this.feesFiltersForm
            .get('status')
            .valueChanges.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[filter by status change]', value);

                if (!_.isNull(value)) {
                    this._feesService.onFilterChanged.next({
                        status: this.fc.status.value
                    });
                }

            });

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._feesService.resetDeclarations();
    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl(this.formDefaultValues.status)
        });
    }

    setFilterFormDefaults(): void {
        this.feesFiltersForm
            .get('status')
            .patchValue('0', { emitEvent: false });
    }

    clearFilter(e: MouseEvent): void {
        e.preventDefault();
        this.setFilterFormDefaults();
    }

    get fc(): any {
        return this.feesFiltersForm.controls;
    }
}
