import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Child } from '../../child/child.model';
import { Subject } from 'rxjs';
import { SessionRoutine } from '../../child/enrolment/enrolment.component';
import { Enrolment } from '../../child/enrolment/models/enrolment.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { NGXLogger } from 'ngx-logger';
import { ParentChildrenService } from '../service/parent-children.service';
import { ParentChildService } from '../service/parent-child.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

@Component({
  selector: 'app-parent-child-navigate',
  templateUrl: './parent-child-navigate.component.html',
  styleUrls: ['./parent-child-navigate.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    slideMotion,
    fadeMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
]
})
export class ParentChildNavigateComponent implements OnInit {
    childrenList: Child[];
    defaultchild: Child;
    index: number;
    private _unsubscribeAll: Subject<any>;
    noData: boolean;
    disableFilterButton: boolean;
    selectedChild: Child;
    pageLoading: boolean;
    disabledPrev: boolean;
    disabledNext: boolean;
    sessionRoutines: SessionRoutine[];
    enrolment: Enrolment[];
    fees: Fee[];
    hideWeekEnd: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        private _logger: NGXLogger,
        private _ParentchildrenService: ParentChildrenService,
        private _ParentchildService: ParentChildService,
        private _fuseSidebarService: FuseSidebarService,
        private _router: Router,
        private _route: ActivatedRoute
        // private _bookingService: ChildBookingService
    ) {
        this.defaultchild = null;
        this.selectedChild = null;
        this._unsubscribeAll = new Subject();
        this.index = 0;
        this.pageLoading = false;
        this.disabledPrev = true;
        this.sessionRoutines = [];
        this.hideWeekEnd = false;
    }

    // tslint:disable-next-line: typedef
    ngOnInit() {
        this._logger.debug('child list view !!!');
        this._ParentchildrenService.onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[children]', response);

                this.childrenList = response.items;
                this.noData = response.totalDisplay < 1 ? true : false;
            });

        this.setDefaultChild();
        this._logger.debug('this setSessionRoutines !!!', this.sessionRoutines);
            
        setTimeout(() => {
            if (this._router.url === '/children') {
                if (!this.noData){
                    this._router.navigate([this.defaultchild.id], { relativeTo: this._route });
                }
                
            }
        }, 100);
    }

    setDefaultChild(): Child {

        return this.defaultchild = this.childrenList.length > 0 ? this.childrenList[this.index] : null;

    }

    accept(e: MouseEvent, item: Enrolment ): void
    {
        e.preventDefault();

        if (!item)
        {
            return;
        }


        this._logger.debug('[branch object]', item);

        // this.buttonLoader = true;

        // this._branchService
        //     .storeBranch(sendObj)
        //     .pipe(takeUntil(this._unsubscribeAll))
        //     .subscribe(
        //         res =>
        //         {
        //             this.buttonLoader = false;

        //             this.resetForm(null);

        //             setTimeout(() => this.matDialogRef.close(res), 250);
        //         },
        //         error =>
        //         {
        //             this.buttonLoader = false;

        //             throw error;
        //         },
        //         () =>
        //         {
        //             this._logger.debug('😀 all good. 🍺');
        //         }
        //     );
    }

}
