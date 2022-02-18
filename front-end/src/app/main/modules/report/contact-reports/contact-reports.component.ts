import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonService } from 'app/shared/service/common.service';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

@Component({
  selector: 'app-contact-reports',
  templateUrl: './contact-reports.component.html',
  styleUrls: ['./contact-reports.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ContactReportsComponent implements OnInit {

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
  constructor(
    private _commonService: CommonService,
    private _fuseSidebarService: FuseSidebarService,
  ) { }

  ngOnInit() {
  }

  updateScroll(): void {
    this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
}

toggleSidebar(name: string): void {
    this._fuseSidebarService.getSidebar(name).toggleOpen();
}

}
