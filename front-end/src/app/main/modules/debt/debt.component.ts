import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { DebtService } from './services/debt.service';
import { CommonService } from 'app/shared/service/common.service';

@Component({
    selector: 'app-debt',
    templateUrl: './debt.component.html',
    styleUrls: ['./debt.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class DebtComponent implements OnInit {

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        private _debtService: DebtService,
        private _commonService: CommonService

    ) {}

    // tslint:disable-next-line: typedef
    ngOnInit() {}

    ngOnDestroy(): void {
        this._debtService.unsubscribeOptions();
    }

    
    /**
   * Update content scroll
   */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }
}
