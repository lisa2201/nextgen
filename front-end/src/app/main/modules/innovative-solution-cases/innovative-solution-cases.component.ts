import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { InnovativeSolutionCasesService } from './service/innovative-solution-cases.service';

@Component({
  selector: 'innovative-solution-cases',
  templateUrl: './innovative-solution-cases.component.html',
  styleUrls: ['./innovative-solution-cases.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InnovativeSolutionCasesComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    
    constructor(
        private _commonService: CommonService,
        private _notification: NotificationService,
        private _innovativeSolutionCaseService: InnovativeSolutionCasesService,
    ) {
        this._unsubscribeAll = new Subject();
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        if (!this._innovativeSolutionCaseService.eventsSet) {
            this._innovativeSolutionCaseService.setEvents();
        }

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

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }
}
