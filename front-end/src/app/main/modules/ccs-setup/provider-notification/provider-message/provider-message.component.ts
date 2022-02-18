import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
import { ProviderMessage } from '../model/provider-message.model';
import { ProviderNotificationService } from '../services/provider-notification.service';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'provider-message-view',
    templateUrl: './provider-message.component.html',
    styleUrls: ['./provider-message.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ProviderMessageComponent implements OnInit, OnDestroy {
    messageData: ProviderMessage[];
    tableLoading: boolean;
    // dateInput: FormControl;
    size: string;

    private _unsubscribeAll: Subject<any>;

    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _providerNotificationService: ProviderNotificationService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {
        this._unsubscribeAll = new Subject();
        this.tableLoading = false;
        // this.dateInput = new FormControl();
        this.size = 'samll';
    }

    ngOnInit(): void {
        this._logger.debug('message list !!!');
        this._providerNotificationService.onMessageChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((messageList: ProviderMessage[]) => {
                this._logger.debug('[messagedata]', messageList);
                this.messageData = messageList;
            });

        //  this._providerNotificationService.getMessageData();

        this._providerNotificationService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        /*this.dateInput.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(dateChanged => {
                

                if (!_.isNull(dateChanged)) {
                    this._logger.debug('[search change]', DateTimeHelper.getUtcDate(dateChanged));
                    this._providerNotificationService.onFilterChanged.next(
                        DateTimeHelper.getUtcDate(dateChanged)
                    );
                }
                else
                {
                    this._logger.debug('[search change]', dateChanged);
                    this._providerNotificationService.onFilterChanged.next(dateChanged);
                }
                
            });*/
    }

    ngOnDestroy(): void {
        
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        console.log('destroyed message');
    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    };

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }
}
