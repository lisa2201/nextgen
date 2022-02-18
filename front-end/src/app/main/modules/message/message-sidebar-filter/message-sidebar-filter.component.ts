import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntil, take } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AuthService } from 'app/shared/service/auth.service';
import { AppConst } from 'app/shared/AppConst';
import { Branch } from '../../branch/branch.model';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { QueryMessageService } from '../service/message.service';

@Component({
    selector: 'message-sidebar-filter',
    templateUrl: './message-sidebar-filter.component.html',
    styleUrls: ['./message-sidebar-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class MessageSidebarFilterComponent implements OnInit {
    isOwner: boolean;

    private _unsubscribeAll: Subject<any>;

    branches: Branch[];
    buttonLoader: boolean;
    messageFiltersForm: FormGroup;

    formDefaultValues = {
        room: null,
        user: null,
        status: '',
        gender: '',
        date_of_birth: null,
    };


    constructor(
        private _authService: AuthService,
        private _fuseSidebarService: FuseSidebarService,
        private _queryMessageService: QueryMessageService,
        private _logger: NGXLogger,
    ) {
        this.branches = [];
        this.isOwner = this.setAccessLevel;
        this.messageFiltersForm = this.createFilterForm();
        this._unsubscribeAll = new Subject();
    }

    // tslint:disable-next-line: typedef
    ngOnInit() {
        
        // Subscribe to branch list changes

        this._queryMessageService.filterData
            .pipe(
                take(1),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {

                if (!value) {
                    return;
                }
                
                if (value.sDate) {
                    this.messageFiltersForm.get('sDate').patchValue(value.sDate, { emitEvent: false });
                }
                if (value.eDate) {
                    this.messageFiltersForm.get('eDate').patchValue(value.eDate, { emitEvent: false });
                }
                
                if (value.branch) {
                    this.messageFiltersForm.get('branch').patchValue(value.branch, { emitEvent: false });
                }
                if (value.new) {
                    this.messageFiltersForm.get('new').patchValue(value.new, { emitEvent: false });
                }

            });

        if (this.isOwner) {
            this._queryMessageService
            .onFilterBranchesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[filter by branch change]', response.branch);

                this.branches = response.branch;
            });
        }

        this._queryMessageService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {
                this.buttonLoader = value;
            });

        this._queryMessageService
            .onQueryByFilter
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this.submitFilter(null);
            });
        
    }

    get setAccessLevel(): any {
        let hasAccess = false;

        switch (this._authService.getUserLevel()) {
            case AppConst.roleLevel.ROOT:
                hasAccess = false;

                break;

            case AppConst.roleLevel.OWNER:
                hasAccess = true;


                break;
            case AppConst.roleLevel.ADMINISTRATION:
                hasAccess = false;

                break;
            default:
                break;
        }

        return hasAccess;
    }

    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            sDate: new FormControl(null),
            eDate: new FormControl(null),
            branch: new FormControl(null),
            new: new FormControl(null),
        });
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }


    checkClearFilter(): any
    {
        return isEqual(this.formDefaultValues, this.getFormValues);
    }

    get fc(): any
    {
        return this.messageFiltersForm.controls;
    }


    get getFormValues(): any
    {
        return {
            branch: this.fc.branch.value,
            sDate: DateTimeHelper.getUtcDate(this.fc.sDate.value),
            eDate: DateTimeHelper.getUtcDate(this.fc.eDate.value),
            new: DateTimeHelper.getUtcDate(this.fc.new.value),
        };
    }

    setFilterFormDefaults(): void
    {
        this.messageFiltersForm.get('branch').patchValue(null, { emitEvent: false });
        this.messageFiltersForm.get('sDate').patchValue(null, { emitEvent: false });
        this.messageFiltersForm.get('eDate').patchValue(null, { emitEvent: false });
        this.messageFiltersForm.get('new').patchValue(null, { emitEvent: false });
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        if (!_.isNull(this._queryMessageService.filterBy))
        {
            // this._queryMessageService.clearLastRememberOptions();
        }


        this.setFilterFormDefaults();

        // this.updateFilterActiveStatus.emit(false);


        setTimeout(() => this._queryMessageService.onFilterChanged.next(null));
    }

    submitFilter(e: MouseEvent | null): void
    {

        if (e) {
            e.preventDefault();
        }

        const filterObj = {
            sDate: DateTimeHelper.getUtcDate(this.fc.sDate.value),
            eDate: DateTimeHelper.getUtcDate(this.fc.eDate.value),
            branch: this.fc.branch.value,
            new: this.fc.new.value ? 'Y' : 'N'
        };

        this._logger.debug('filterobj', filterObj);
        
        this._queryMessageService.filterBy = filterObj;
        this._queryMessageService.resetPagination();

        this._queryMessageService.getMessages(null);

    }
}
