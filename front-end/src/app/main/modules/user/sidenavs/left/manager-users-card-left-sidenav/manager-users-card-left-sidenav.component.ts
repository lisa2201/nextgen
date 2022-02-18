import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { UsersService } from '../../../services/users.service';
import { CommonHelper } from 'app/utils/common.helper';
import { Room } from 'app/main/modules/room/models/room.model';
import { Role } from 'app/main/modules/role/role.model';
import { UserService } from '../../../services/user.service';

@Component({
    selector: 'manager-users-card-left-sidenav',
    templateUrl: './manager-users-card-left-sidenav.component.html',
    styleUrls: ['./manager-users-card-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ManagerUsersCardLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    // userDependencies: any;

    usersCardFiltersForm: FormGroup;

    formDefaultValues = {
        status: '1',
        room: null,
        role: null
    };
    rooms: Room[];
    roles: Role[];

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {UsersService} _usersService
     */
    constructor(
        private _logger: NGXLogger,
        private _usersService: UsersService
    )
    {
        // Set defaults
        this.rooms = [];
        this.roles = [];
        this.showFilterButton = false;
        this.usersCardFiltersForm = this.createFilterForm();

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
        this._logger.debug('user card left side nav!!!');

        // Subscribe to rooms changes
        this._usersService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: any) => {
                this._logger.debug('[rooms-list]', rooms);
                this.rooms = rooms.items;
            });

            // Subscribe to rooms changes
        this._usersService
            .onRoleChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((roles: any) => {
                this._logger.debug('[roles-list]', roles);
                this.roles = roles.items.filter(v => v.type === 'KM8-AP');
            });

        // Subscribe to filter changes
        this.usersCardFiltersForm
            .get('status')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by status change]', value);

                if (!_.isNull(value))
                {
                    this._usersService.onFilterChanged.next(this.getFormValues);
                }

                this.checkClearFilter();
            });
  
        this.usersCardFiltersForm
            .get('room')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by room change]', value);

                if (!_.isNull(value))
                {
                    this._usersService.onFilterChanged.next(this.getFormValues);
                }

                this.checkClearFilter();
            });

        this.usersCardFiltersForm
            .get('role')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by role change]', value);

                if (!_.isNull(value))
                {
                    this._usersService.onFilterChanged.next(this.getFormValues);
                }

                this.checkClearFilter();
            });
        
        
        // Subscribe to users list changes
        this._usersService
            .onUsersChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this.usersCardFiltersForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

                // reset filter
                if (response.total < 1)
                {
                    this.setFilterFormDefaults();
                } 
            });
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

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.usersCardFiltersForm.controls;
    }

    get getFormValues(): any
    {
        return {
            status: this.fc.status.value,
            room: this.fc.room.value,
            role: this.fc.role.value
        };
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            status: new FormControl(''),
            room: new FormControl(''),
            role: new FormControl('')
        });
    }

    setFilterFormDefaults(): void
    {
        this.usersCardFiltersForm.get('status').patchValue('1', { emitEvent: false });
        this.usersCardFiltersForm.get('room').patchValue(null, { emitEvent: false });
        this.usersCardFiltersForm.get('role').patchValue(null, { emitEvent: false });

        this.showFilterButton = false;
    }

    setLastRememberOptions(values: any): void
    {
        for (const key in this.fc)
        {
            this.fc[key].patchValue(_.get(values, key), { emitEvent: false });
        }

        this.showFilterButton = true;
    }

    checkClearFilter(): void
    {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
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
        
        // update table
        setTimeout(() => this._usersService.onFilterChanged.next(this.getFormValues));
    }
}
