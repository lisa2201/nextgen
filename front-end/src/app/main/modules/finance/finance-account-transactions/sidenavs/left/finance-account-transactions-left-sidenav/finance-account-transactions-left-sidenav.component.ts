import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { FinanceAccountTransactionService } from '../../../services/finance-account-transaction.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { CommonHelper } from 'app/utils/common.helper';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ActivatedRoute, Router } from '@angular/router';
import { Child } from 'app/main/modules/child/child.model';
import { User } from 'app/main/modules/user/user.model';

@Component({
    selector: 'app-finance-account-transactions-left-sidenav',
    templateUrl: './finance-account-transactions-left-sidenav.component.html',
    styleUrls: ['./finance-account-transactions-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountTransactionsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    financeAccountTransactionFilterForm: FormGroup;
    children: Child[];
    childrenList: Child[];
    parents: User[];
    loading: boolean;

    formDefaultValues: any;

    constructor(
        private _financeAccountTransactionService: FinanceAccountTransactionService,
        private _logger: NGXLogger,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.loading = false;
        this.financeAccountTransactionFilterForm = this.createFilterForm();

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

        this._financeAccountTransactionService.onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._financeAccountTransactionService
            .onFilterChildrenChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((children: Child[]) => {
                this.childrenList = children;
                this.children = children;
            });

        this._financeAccountTransactionService
            .onFilterParentChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((parents: User[]) => {
                this.parents = parents;
            });

        this.financeAccountTransactionFilterForm
            .get('parent')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: any) => {
                this.parentChangeHandler(value);
            });

        this._financeAccountTransactionService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.loading = value;
            });
        
        // Filter by single perso
        setTimeout(() => this.filterByPerson(), 200);

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
        return this.financeAccountTransactionFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            type: this.fc.type.value,
            date: this.fc.date.value,
            category: this.fc.category.value,
            parent: this.fc.parent.value,
            child: this.fc.child.value,
            reversed: this.fc.reversed.value,
            parent_status: this.fc.parent_status.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            type: new FormControl('0'),
            date: new FormControl(null),
            category: new FormControl('0'),
            parent: new FormControl(null),
            child: new FormControl(null),
            reversed: new FormControl(false),
            parent_status: new FormControl('0')
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.financeAccountTransactionFilterForm.get('type').patchValue('0', { emitEvent: false });
        this.financeAccountTransactionFilterForm.get('date').patchValue(null, { emitEvent: false });
        this.financeAccountTransactionFilterForm.get('category').patchValue('0', { emitEvent: false });
        this.financeAccountTransactionFilterForm.get('parent').patchValue(null, { emitEvent: true });
        this.financeAccountTransactionFilterForm.get('child').patchValue(null, { emitEvent: false });
        this.financeAccountTransactionFilterForm.get('reversed').patchValue(false, { emitEvent: false });
        this.financeAccountTransactionFilterForm.get('parent_status').patchValue('0', { emitEvent: false });
        this.showFilterButton = false;
    }

    /**
     * Set reset filter
     */
    checkClearFilter(): void {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    /**
     * Clear filter
     * @param {MouseEvent} e 
     */
    clearFilter(e: MouseEvent): void {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        this.filter(null);

    }

    /**
     * Filter by Person
     */
    filterByPerson(): void {

        if (this._route.snapshot.queryParamMap.get('parent')) {

            const queryparam = this._route.snapshot.queryParamMap.get('parent');

            this._logger.debug('[filter by parent]', queryparam);

            this.financeAccountTransactionFilterForm.get('parent').patchValue(queryparam, { emitEvent: true });

            this.filter(null);

        }


    }

    /**
     * Clear Query Params
     */
    clearQueryParams(): void {
        this._router.navigate(['.'], { relativeTo: this._route, queryParams: null });
    }

    parentChangeHandler(value: any): void {

        this.financeAccountTransactionFilterForm.get('child').reset();

        if (value) {
            
            const selectedparent = _.find(this.parents, {id: value});

            if (selectedparent) {
                this.children = selectedparent.children ? _.map(selectedparent.children, (val: any, idx: number) => new Child(val,idx)) : [];
            } else {
                this.children = [];
            }

        } else {
            this.children = [...this.childrenList];
        }

    }

    filter(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const values = this.getFormValues;

        this._financeAccountTransactionService.onFilterChanged.next(values);

        if (values.parent) {
            this._financeAccountTransactionService.onFilterByParent.next(true);
        } else {
            this._financeAccountTransactionService.onFilterByParent.next(false);
            this.clearQueryParams();
        }

        if (values.reversed === true) {
            this._financeAccountTransactionService.onFilterShowReversed.next(true);
        } else {
            this._financeAccountTransactionService.onFilterShowReversed.next(false);
        }

        this.checkClearFilter();

    }

}
