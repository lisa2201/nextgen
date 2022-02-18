import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildrenService } from '../../../services/children.service';

import { User } from 'app/main/modules/user/user.model';
import { Room } from 'app/main/modules/room/models/room.model';

import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'children-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildrenFiltersComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    users: User[];
    rooms: Room[];
    ccsFilters: Array<any>;
    parentCcsFilters = [
        {
            value: 'Pending Parent confirmation',
            key: 1
        },
        {
            value: 'Parent Approved',
            key: 2
        }
    ]

    buttonLoader: boolean;
    childrenFiltersForm: FormGroup;

    formDefaultValues = {
        room: null,
        user: null,
        status: '',
        gender: '',
        date_of_birth: null,
        ccs_filter: null,
        parent_confirmation_ccs_filter: null
    };

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildrenService} _childrenService
     */
    constructor(
        private _logger: NGXLogger,
        private _childrenService: ChildrenService
    )
    {
        // set default values
        this.buttonLoader = false;
        this.updateFilterActiveStatus = new EventEmitter();
        this.childrenFiltersForm = this.createFilterForm();

        // check if filter has last remember options
        if (!_.isNull(this._childrenService.filterBy))
        {
            this.setLastRememberOptions(this._childrenService.filterBy);
        }
        else
        {
            this.setFilterFormDefaults();
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('children view filters !!!');

        // Subscribe to children list changes
        this._childrenService
            .onFilterDependencyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[dependency]', response);

                this.rooms = response.rooms;
                this.users = response.users;
                this.ccsFilters = response.depend.CCSFilters
            });
        
        // Subscribe to view loader changes
        this._childrenService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.buttonLoader = value);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateFilterActiveStatus.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.childrenFiltersForm.controls;
    }

    /**
     * disable future dates
     *
     * @memberof ChildAddDialogComponent
     */
    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    get getFormValues(): any
    {
        return {
            room: this.fc.room.value,
            user: this.fc.user.value,
            status: this.fc.status.value,
            gender: this.fc.gender.value,
            date_of_birth: DateTimeHelper.getUtcDate(this.fc.date_of_birth.value),
            ccs_filter: this.fc.ccs_filter.value,
            parent_confirmation_ccs_filter: this.fc.parent_confirmation_ccs_filter.value,
        };
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            room: new FormControl(null),
            user: new FormControl(null),
            status: new FormControl(null),
            gender: new FormControl(null),
            date_of_birth: new FormControl(null),
            ccs_filter: new FormControl(null),
            parent_confirmation_ccs_filter: new FormControl(null),
        });
    }

    setFilterFormDefaults(): void
    {
        this.childrenFiltersForm.get('room').patchValue(null, { emitEvent: false });
        this.childrenFiltersForm.get('user').patchValue(null, { emitEvent: false });
        this.childrenFiltersForm.get('status').patchValue('', { emitEvent: false });
        this.childrenFiltersForm.get('gender').patchValue('', { emitEvent: false });
        this.childrenFiltersForm.get('date_of_birth').patchValue(null, { emitEvent: false });
        this.childrenFiltersForm.get('ccs_filter').patchValue(null, { emitEvent: false });
        this.childrenFiltersForm.get('parent_confirmation_ccs_filter').patchValue(null, { emitEvent: false });
    }

    setLastRememberOptions(values: any): void
    {
        for (const key in this.fc)
        {
            this.fc[key].patchValue(_.get(values, key), { emitEvent: false });
        }
    }

    checkClearFilter(): boolean
    {
        return isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        if (!_.isNull(this._childrenService.filterBy))
        {
            this._childrenService.clearLastRememberOptions();
        }

        // reset to default
        this.setFilterFormDefaults();

        this.updateFilterActiveStatus.emit(false);

        // update view
        setTimeout(() => this._childrenService.onFilterChanged.next(null));
    }

    submitFilter(e: MouseEvent): void
    {
        e.preventDefault();

        this._childrenService.onFilterChanged.next(this.getFormValues);

        this.updateFilterActiveStatus.emit(true);
    }
}
