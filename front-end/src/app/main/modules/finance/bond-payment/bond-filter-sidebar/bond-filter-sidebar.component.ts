import { Component, OnInit, ViewEncapsulation, EventEmitter, Output, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl } from '@angular/forms';
import { User } from 'app/main/modules/user/user.model';
import * as isEqual from 'fast-deep-equal';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { BondPaymentservice } from '../service/bond-payment.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { NGXLogger } from 'ngx-logger';
import { Child } from 'app/main/modules/child/child.model';

@Component({
  selector: 'bond-payment-filter-sidebar',
  templateUrl: './bond-filter-sidebar.component.html',
  styleUrls: ['./bond-filter-sidebar.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BondFilterSidebarComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    filterForm: FormGroup;
    userList: User[];
    selectedChild: Child[];

    bondType = [
        {
            value: '0',
            lable: 'Receiving',
        },
        {
            value: '1',
            lable: 'Returning',
        },
    ];
    

    formDefaultValues: any;

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;
  constructor
  (
    private _bonPaymentService: BondPaymentservice,
    private _logger: NGXLogger,
  ) 
  { 
    this.updateFilterActiveStatus = new EventEmitter();
    this.buttonLoader = false;
    this.userList = [];
    this._unsubscribeAll = new Subject();
    this.selectedChild = [];
  }

  ngOnInit(): void {

    this.filterForm = this.createFilterForm();
    this._bonPaymentService
            .onUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: User[]) => {
                this._logger.debug('[parents list]', response);
                this.userList = response;
            });

            this.filterForm
        .get('user')
        .valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(value =>
        {
            this._logger.debug('[user value change]', value);

            if (!_.isNull(value))
            {
                // this.selectedChild = [];

                // const group = _.find(this.userList, ['id', value]);

                // if (group && _.keys(group.children).length > 0)
                // {
                //     this.selectedChild = _.map(group.children);
                // }
                // else {
                //     this.filterForm.get('child').patchValue(null, { emitEvent: false });
                // }
                this.selectedChild =  this.getChild(value);

               if(this.selectedChild.length < 1){
                    this.filterForm.get('child').patchValue(null, { emitEvent: false });
               }
            }
            else
            {
                this.selectedChild = [];
            }

        });

    this._bonPaymentService.onDefaultFilterChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((defaultValues: any) => {
            this.formDefaultValues = defaultValues;
        });

  }

  getChild(value: string): any
    {
        return (value && !_.isEmpty(this.userList.find(i => i.id === value))) ? this.userList.find(i => i.id === value).children : [];
    }
  createFilterForm(): FormGroup {
    return new FormGroup({
        date: new FormControl(null),
        type: new FormControl(null),
        child: new FormControl(null),
        user: new FormControl(null),
        amount: new FormControl(null),
        comments: new FormControl(null),
        parent_status: new FormControl('0')
    });
}

    get fc(): any {
        return this.filterForm.controls;
    }

    get getFormValues(): any {
        return {
            type: this.fc.type.value,
            child: this.fc.child.value,
            user: this.fc.user.value,
            amount: this.fc.amount.value,
            comments: this.fc.comments.value,
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
        };
    }

    setFilterFormDefaults(): void
    {
        this.filterForm.get('type').patchValue(null, { emitEvent: false });
        this.filterForm.get('child').patchValue(null, { emitEvent: false });
        this.filterForm.get('user').patchValue('', { emitEvent: false });
        this.filterForm.get('amount').patchValue('', { emitEvent: false });
        this.filterForm.get('comments').patchValue('', { emitEvent: false });
        this.filterForm.get('date').patchValue(null, { emitEvent: false });
        this.filterForm.get('parent_status').patchValue('0', { emitEvent: false });
    }
    checkClearFilter(): boolean
    {
        return isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        if (!_.isNull(this._bonPaymentService.filterBy))
        {
            this._bonPaymentService.clearLastRememberOptions();
        }

        // reset to default
        this.setFilterFormDefaults();
        this.selectedChild = [];

        this.updateFilterActiveStatus.emit(false);

        // update view
        setTimeout(() => this._bonPaymentService.onFilterChanged.next(null));
    }

    submitFilter(e: MouseEvent): void
    {
        e.preventDefault();

        if (!this.checkClearFilter())
        {
            console.log('getform value', this.getFormValues);
            
            this._bonPaymentService.onFilterChanged.next(this.getFormValues);

            this.updateFilterActiveStatus.emit(true);
        }
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._bonPaymentService.unsubscribeOptions();


    }

}
