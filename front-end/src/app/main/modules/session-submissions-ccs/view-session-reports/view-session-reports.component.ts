import {Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
// import { ProviderMessage } from '../model/provider-message.model';
// import { ProviderNotificationService } from '../services/provider-notification.service';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import {Child} from '../../child/child.model';
import {ChildrenService} from '../../child/services/children.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {SessionSubmissionsService} from '../session-submissions.service';
import {updateScrollPosition} from '../../../../shared/enum/update-scroll-position';
import {CommonService} from '../../../../shared/service/common.service';
import {FusePerfectScrollbarDirective} from '../../../../../@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
@Component({
    selector: 'view-session-reports',
    templateUrl: './view-session-reports.component.html',
    styleUrls: ['./view-session-reports.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ViewSessionReportsComponent implements OnInit, OnDestroy {
    // messageData: ProviderMessage[];
    tableLoading: boolean;
    dateInputStart: FormControl;
    dateInputEnd: FormControl;
    child: FormControl;
    size: string;
    childrenList: Child[];

    private _unsubscribeAll: Subject<any>;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        // private _providerNotificationService: ProviderNotificationService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _sessionSubmissionsService: SessionSubmissionsService,
        private _commonService: CommonService,
    ) {
        this._unsubscribeAll = new Subject();
        this.tableLoading = false;
        this.dateInputStart = new FormControl();
        this.dateInputEnd = new FormControl();
        this.child = new FormControl();
        this.size = 'large';
    }

    ngOnInit(): void {
        this._logger.debug('message list !!!');
        /*this._childrenService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[list view - children]', response);

                this.childrenList = response.items;
            });
        console.log(this.childrenList);*/
        if (!this._sessionSubmissionsService.eventsSet) {
            this._sessionSubmissionsService.setEvents();
        }
    }

    ngOnDestroy(): void {
        
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._sessionSubmissionsService.unsubscribeOptions();
        console.log('destroyed message');
    }

    disabledDateOnlyMonday = (current: Date): boolean => {
        return current.getDay() !== 1;
    };
    disabledDateOnlySunday = (current: Date): boolean => {
        if(this.dateInputStart.value == null)
            return current.getDay() !== 0;
        else
            return differenceInCalendarDays.default(current, this.dateInputStart.value) < 0 || current.getDay() !== 0;
    };
    setMinDate(event): void {

    }

    updateScroll(): void
    {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);
    }
}
