import {Component, OnInit, ViewEncapsulation, EventEmitter, Output} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {Subject} from 'rxjs';
import {User} from 'app/main/modules/user/user.model';
import {FormGroup, FormControl} from '@angular/forms';
import {NGXLogger} from 'ngx-logger';
import {takeUntil} from 'rxjs/operators';
import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {StaffIncidentService} from '../services/staff-incident.service';
import {AuthService} from 'app/shared/service/auth.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})

export class SidenavComponent implements OnInit {

// Private
  private _unsubscribeAll: Subject<any>;

  stafflist: User[];    
  showFilterButton: boolean;

  filtersForm: FormGroup;
  formDefaultValues = {   
      start_date: null,
      end_date: null,
      staff: null,
  };

  buttonLoader: boolean;

  @Output()

  updateFilterActiveStatus: EventEmitter<boolean>;

  /**
   * Constructor
   *
   * @param {NGXLogger} _logger
   * @param {StaffIncidentService} StaffIncidentService
   */

  constructor(
    private _logger: NGXLogger,
    private _StaffIncidentService: StaffIncidentService,
    private _authService: AuthService,
    private _route: ActivatedRoute,
  ) {
    // Set defaults
  this.stafflist = [];
  this.showFilterButton = false;
  this.filtersForm = this.createFilterForm();
  this.buttonLoader = false;
  this.setFilterFormDefaults();

  // Set the private defaults
  this._unsubscribeAll = new Subject();
  this.updateFilterActiveStatus = new EventEmitter(); 
  }

  /**
   * On init
   */
  ngOnInit(): void {
    this._StaffIncidentService.getUsers('1').pipe(takeUntil(this._unsubscribeAll)).subscribe((value) => {
      this.stafflist = value;
    });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  get fc(): any {
    return this.filtersForm.controls;
  }

  get getFormValues(): any {
    return {            
      start_date: (this.fc.date.value) ? DateTimeHelper.getUtcDate(this.fc.date.value[0]) : null,
      end_date: (this.fc.date.value) ? DateTimeHelper.getUtcDate(this.fc.date.value[1]) : null,
      staff: this.fc.staff.value
    };

  }

  createFilterForm(): FormGroup {
    return new FormGroup({
      date: new FormControl([null, null]),
      staff: new FormControl(null)
    });
  }

  setFilterFormDefaults(): void {        
    // let today = new Date();

    // this.filtersForm.get('date').patchValue([format(today,'yyyy-MM-dd'), format(today,'yyyy-MM-dd')], {emitEvent: false});
    this.filtersForm.get('date').patchValue(null, {emitEvent: false});
    this.filtersForm.get('staff').patchValue(null, {emitEvent: false});
    this.showFilterButton = false;
  }

  trackByFn(index: number, item: any): number
  {
      return index;
  }
  
  checkClearFilter(): boolean {
    return isEqual(this.formDefaultValues, this.getFormValues);
  }

  clearFilter(e: MouseEvent): void {
    e.preventDefault();

    this.setFilterFormDefaults();
    this._StaffIncidentService.onFilterChanged.next(this.getFormValues);
  }

  submitFilter(e: MouseEvent): void {
    e.preventDefault();

    if (!this.checkClearFilter()) {
      this._StaffIncidentService.onFilterChanged.next(this.getFormValues);
      this.updateFilterActiveStatus.emit(true);
    }
  }

}