import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Child } from '../../child.model';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ChildrenService } from '../../services/children.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'child-cultural-background-view',
  templateUrl: './cultural-background-view.component.html',
  styleUrls: ['./cultural-background-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class ChildViewCulturalBackgroundViewComponent implements OnInit, OnDestroy {

  // Private
  private _unsubscribeAll: Subject<any>;

  child: Child;
  buttonLoader: boolean;

  @Input() selected: Child;

  @Output()
  updateScroll: EventEmitter<any>;

  constructor(
    private _logger: NGXLogger,
    private _router: Router,
    private _childrenService: ChildrenService
  ) {

    this.updateScroll = new EventEmitter();


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
    this._logger.debug('child details - cultural view !!!');

    // Initial reference
    this.child = this.selected;

    // Subscribe to update current child on changes
    this._childrenService
      .onCurrentChildChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(currentChild => this.child = (!currentChild) ? null : currentChild);

  }

  ngOnDestroy(): void {
    this.updateScroll.unsubscribe();
  }
}
