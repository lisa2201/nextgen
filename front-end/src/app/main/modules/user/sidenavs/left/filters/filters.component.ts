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
import { RoomService } from 'app/main/modules/room/services/room.service';
import { UsersService } from '../../../services/users.service';

import { User } from 'app/main/modules/user/user.model';
import { Room } from 'app/main/modules/room/models/room.model';

import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'parent-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentFiltersComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    rooms: Room[];

    buttonLoader: boolean;
    parentFiltersForm: FormGroup;

    formDefaultValues = {
        room: null,
        status: '1'
    };

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {UsersService} _usersService
     */
    constructor(
        private _logger: NGXLogger,
        private _usersService: UsersService,
        private _roomService: RoomService,
        
    )
    {
        // set default values
        this.buttonLoader = false;
        this.updateFilterActiveStatus = new EventEmitter();
        this.parentFiltersForm = this.createFilterForm();

        // check if filter has last remember options
        if (!_.isNull(this._usersService.filterBy))
        {
            this.setLastRememberOptions(this._usersService.filterBy);
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
        this._logger.debug('parent view filters !!!');

        // Subscribe to parent list changes
        this._roomService
                .getAllRooms()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((response: any) =>
                {
                    this._logger.debug('[dependency]', response);
                    this.rooms = response;
                });

      
        
        // Subscribe to view loader changes
        this._usersService
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
        return this.parentFiltersForm.controls;
    }

    get getFormValues(): any
    {
        return {
            room: this.fc.room.value,
            status: this.fc.status.value
        };
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            room: new FormControl(null),
            status: new FormControl(null)
        });
    }

    setFilterFormDefaults(): void
    {
        this.parentFiltersForm.get('room').patchValue(null, { emitEvent: false });
        this.parentFiltersForm.get('status').patchValue('1', { emitEvent: false });
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

        if (!_.isNull(this._usersService.filterBy))
        {
            this._usersService.clearLastRememberOptions();
        }

        // reset to default
        this.setFilterFormDefaults();

        this.updateFilterActiveStatus.emit(false);

        // update view
        setTimeout(() => this._usersService.onFilterChanged.next(null));
    }

    submitFilter(e: MouseEvent): void
    {
        e.preventDefault();

        this._usersService.onFilterChanged.next(this.getFormValues);

        this.updateFilterActiveStatus.emit(true);
    }
}
