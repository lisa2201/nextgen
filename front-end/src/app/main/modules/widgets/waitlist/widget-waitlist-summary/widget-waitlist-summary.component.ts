import {
    Component,
    OnInit,
    ViewEncapsulation,
    OnDestroy,
    AfterViewInit,
    Input,
    ViewChild,
    ElementRef
} from '@angular/core';
import {takeUntil, finalize, startWith, distinctUntilChanged, skip} from 'rxjs/operators';
import {Subject} from 'rxjs';

import {NGXLogger} from 'ngx-logger';

import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';

import {AuthService} from 'app/shared/service/auth.service';
import {DashboardService} from 'app/main/modules/dashboard/services/dashboard.service';

import {AuthClient} from 'app/shared/model/authClient';
import {Router} from '@angular/router';
import {FormControl} from '@angular/forms';
import {DateTimeHelper} from '../../../../../utils/date-time.helper';
import * as _ from 'lodash';
import {AppConst} from '../../../../../shared/AppConst';
import {DatePipe} from '@angular/common'

@Component({
    selector: 'widget-waitlist-summary',
    templateUrl: './widget-waitlist-summary.component.html',
    styleUrls: ['./widget-waitlist-summary.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class WidgetWaitlistSummaryComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    waitlistData: any;
    is_sitemanager: boolean;
    widgetLoader: boolean;
    calendarWeek: FormControl;
    week: string;

    @Input() selectedBranch: string;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {Router} _router
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _dashboardService: DashboardService,
        private _router: Router,
        public datepipe: DatePipe
    ) {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;
        this.is_sitemanager = false;
        // Set the private defaults
        this.waitlistData = {
            'enrol_count': 0,
            'waitlist_count': 0
        }
        this.week = 'This week';
        this.calendarWeek = new FormControl(DateTimeHelper.now().toDate());
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        if (this._authService.isOwnerPath()) {
            this.is_sitemanager = true;
        }

        // Subscribe to form value changes
        this.calendarWeek
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                startWith(this.calendarWeek.value),
                distinctUntilChanged(),
                skip(1)
            )
            .subscribe(value => {
                if (_.isNull(value)) {
                    return;
                }

                this.updateWaitListWidget();
            });

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this.selectedBranch = value;

                setTimeout(() => this.updateWaitListWidget(), 250);
            });
    }

    ngAfterViewInit(): void {
        // initial load
        setTimeout(() => this.updateWaitListWidget(), 250);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * show month view selector
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    toggleCalendar(e: MouseEvent): void {
        e.preventDefault();

        if (this.widgetLoader) {
            return;
        }

        (<HTMLElement>(<HTMLElement>this.weekCalenderInput.nativeElement).querySelector('.ant-picker-input')).click();
    }

    /**
     * get waitlist data
     */
    updateWaitListWidget(): void {

        this.widgetLoader = true;

        this._dashboardService
            .getWaitlist(
                this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id,
                DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),
                DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly)
            )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false,
                )
            )
            .subscribe(
                res => {
                    this._logger.debug('[waitlist dashboard]', res);
                    this.week = this.datepipe.transform(DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly), 'dd-MM-yyyy');
                    this.waitlistData = res;
                },
                error => {
                    throw error;
                }
            );
    }

    /**
     * navigate to waitlist page
     *
     * @returns {void}
     */
    navigate(e: MouseEvent): void {
        e.preventDefault();
        this._router.navigate(['manage-waitlist'], {
            state: {
                category: 'waitlist',
                selectedBranch: this.selectedBranch === '' ? null : this.selectedBranch
            }
        });
    }

}
