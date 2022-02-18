import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { delay, finalize, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { TranslateService } from '@ngx-translate/core';
import { FuseConfigService } from '@fuse/services/config.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';

import { navigation } from 'app/navigation/navigation';
import { AuthUser } from 'app/shared/model/authUser';
import { AppConst } from 'app/shared/AppConst';
import { AuthClient } from 'app/shared/model/authClient';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { User } from 'app/main/modules/user/user.model';
import { Child } from 'app/main/modules/child/child.model';

import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { ImmunisationTracker } from 'app/main/modules/child/immunisation-tracking/model/immunisation-tracker.model';
import { ImmunisationSchedule } from 'app/main/modules/immunisation/model/immunisation-schedule.model';
import { NzNotifyPosition } from 'app/shared/enum/nz-notify-position.enum';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import {CenterSettingsService} from '../../../main/modules/centre-settings/center-settings/service/center-settings.service';

export interface ReminderItems {
    schedule?: ReminderSchedule[]
    child?: Child;
    pastDue:ReminderSchedule[];
    dueSoon:ReminderSchedule[];
    immunisation?: Immunisation[];
}

export interface ReminderSchedule {
    status: string
    schedule?: ImmunisationSchedule
    immunisation?: Immunisation;
    tracker? : ImmunisationTracker,
    trackingDate?: string;
}

export interface GroupReminder {
    pastDue:ReminderSchedule[]
    dueSoon:ReminderSchedule[]
}

export interface NewGroupReminder {
    immunisation: Immunisation;
    past: number;
    near: number;
    date: string;
}

export interface NewReminderItems {
    reminderDataFirst?: NewGroupReminder[];
    reminderDataMore?: NewGroupReminder[];
    child?: Child;
    expand?: boolean;
}

@Component({
    selector: 'toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})

export class ToolbarComponent implements OnInit, OnDestroy 
{
    horizontalNavbar: boolean;
    rightNavbar: boolean;
    hiddenNavbar: boolean;
    languages: any;
    navigation: any;
    selectedLanguage: any;
    userStatusOptions: any[];
    callBackImage: string;
    userObj: AuthUser;
    client: AuthClient;
    logo: string;
    kinderConnectLoading: boolean;
    isSiteManager: boolean;
    isAdministrative: boolean;
    branchLinks: User[];
    branchAccessLoader: boolean;
    childrenList: Child[];
    immunisationTable: NewReminderItems[];
    centerSettingsData: any;
    
    // Private
    private _unsubscribeAll: Subject<any>;

    /**
     * Constructor
     * 
     * @param {FuseConfigService} _fuseConfigService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {TranslateService} _translateService
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notificationService
     * @param _centerSettingsService
     * @param {CommonService} _commonService
     * @param {Router} _router
     */
    constructor(
        private _fuseConfigService: FuseConfigService,
        private _fuseSidebarService: FuseSidebarService,
        private _translateService: TranslateService,
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
        private _commonService: CommonService,
        private _router: Router,
        private _centerSettingsService: CenterSettingsService,
    )
    {
        // Set the defaults
        this.userStatusOptions = [
            {
                title: 'Online',
                icon: 'icon-checkbox-marked-circle',
                color: '#4CAF50'
            },
            {
                title: 'Away',
                icon: 'icon-clock',
                color: '#FFC107'
            },
            {
                title: 'Do not Disturb',
                icon: 'icon-minus-circle',
                color: '#F44336'
            },
            {
                title: 'Invisible',
                icon: 'icon-checkbox-blank-circle-outline',
                color: '#BDBDBD'
            },
            {
                title: 'Offline',
                icon: 'icon-checkbox-blank-circle-outline',
                color: '#616161'
            }
        ];

        this.languages = [
            {
                id: 'en',
                title: 'English',
                flag: 'us'
            },
            {
                id: 'tr',
                title: 'Turkish',
                flag: 'tr'
            }
        ];

        this.client = this._authService.getClient();
        this.navigation = navigation;
        this.callBackImage = AppConst.image.PROFILE_CALLBACK;
        this.logo = AppConst.image.DEFAULT_LOGO;
        this.kinderConnectLoading = false;
        this.isSiteManager = this._authService.isOwner();
        this.isAdministrative = this._authService.isAdministrative();
        this.branchLinks = [];
        this.branchAccessLoader = false;
        this.immunisationTable = [];

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void 
    {
        // Subscribe to the config changes
        this._fuseConfigService
            .config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((settings: any) => 
            {
                this.horizontalNavbar = settings.layout.navbar.position === 'top';
                this.rightNavbar = settings.layout.navbar.position === 'right';
                this.hiddenNavbar = settings.layout.navbar.hidden === true;
            });

        // Set the selected language from default languages
        this.selectedLanguage = _.find(this.languages, { id: this._translateService.currentLang });

        // Subscribe to the user changes
        this._authService
            .currentUser
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: AuthUser) => 
            {
                this._logger.debug('[user toolbar]', user);

                this.userObj = user;
            });

        // Subscribe to the site-manager branch access changes
        if (this._authService.isAuthenticated() && this._authService.isOwner()) 
        {
            this._authService
                .getOwnerBranchAccess()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((response: User[]) => 
                {
                    this._logger.debug('[site manager branch access - toolbar]', response);

                    this.branchLinks = _.orderBy(response, u => _.lowerCase(_.trim(u.branch.name)), 'asc');
                });
        }

        if (this._authService.isAuthenticated() && this._authService.isAdministrative()) 
        {
            this._commonService
                .onChildListChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((children: Child[]) => this.childrenList = children);

            this._commonService
                .getChildrenWithoutPrimaryPayer()
                .subscribe((children: Child[]) => 
                {
                    if (children.length > 0) 
                    {
                        const title = 'Primary payer not assigned';
                        const content = 'There are children without primary payer assigned. Please visit child details page and assign the relevant parent as primary payer.';
                        
                        this._notificationService.displayNotification(
                            title,
                            content,
                            NotifyMessageType.BLANK,
                            0,
                            NzNotifyPosition.TOP_LEFT
                        )
                    }
                });
        }

        if (this._authService.isAuthenticated() && this._authService.isAdministrative() && this._authService.canAccess(['AC0'], 'N60')) 
        {
            this._commonService.onReminderChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((value: boolean) => 
                {
                    if(value) 
                    {
                        this.getReminder();
                    }
                });

                this.getReminder();
        }

        // get logo
        this._centerSettingsService.getClientInformation();
        this._centerSettingsService
            .onCenterSettingsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => this.centerSettingsData = response);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.immunisationTable = [];

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * Toggle sidebar open
     *
     * @param key
     */
    toggleSidebarOpen(key: any): void 
    {
        this._fuseSidebarService.getSidebar(key).toggleOpen();
    }

    /**
     * Search
     *
     * @param value
     */
    search(value: string): void 
    {
        // Do your search here...
        // console.log(value);
    }

    /**
     * Set the language
     *
     * @param lang
     */
    setLanguage(lang: any): void 
    {
        // Set the selected language for the toolbar
        this.selectedLanguage = lang;

        // Use the selected language for translations
        this._translateService.use(lang.id);
    }

    /**
     * logout user
     */
    doLogout(e: MouseEvent): void 
    {
        e.preventDefault();

        setTimeout(() => {
            this._authService
                .logout()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    () => setTimeout(() => location.reload(), 1500),
                    error => { throw error; },
                    () => this._logger.debug('😀 logout success. 🍺')
                );
        }, 150);
    }

    /**
     * login to kinder connect application
     *
     * @param {MouseEvent} e
     */
    processKinderConnect(e: MouseEvent): void 
    {
        e.preventDefault();

        if (this.client && this.client.hasKinderConnect) 
        {
            this.kinderConnectLoading = true;

            this._notificationService.displaySnackBar('Connecting to KinderConnect...', NotifyType.LOADING);

            this._authService
                .loginToKinderConnect()
                .pipe(
                    delay(500),
                    takeUntil(this._unsubscribeAll),
                    finalize(() => {
                        this.kinderConnectLoading = false;

                        this._notificationService.clearSnackBar()
                    })
                )
                .subscribe(
                    response => {
                        setTimeout(() => this._notificationService.displaySnackBar('Connected successfully!', NotifyType.INFO), 150);

                        window.open(response, '_blank');
                    },
                    error => { throw error; },
                    () => this._logger.debug('😀 logout success. 🍺')
                );
        }
    }

    /**
     * access to kinder pay
     *
     * @param {MouseEvent} e
     * @param {User} item
     */
    accessBranch(e: MouseEvent, item: User): void 
    {
        e.preventDefault();

        this.branchAccessLoader = true;

        this._authService
            .loginToKinderPay(item.branch.id, item.id)
            .pipe(
                delay(500),
                takeUntil(this._unsubscribeAll),
                finalize(() => this.branchAccessLoader = false)
            )
            .subscribe(
                response => window.open(response, '_blank'),
                error => { throw error; },
                () => this._logger.debug('😀 logout success. 🍺')
            );
    }

    /**
     * get immunisation reminders
     *
     * @returns {*}
     */
    getReminder(): any 
    {
        return new Promise<void>((resolve, reject) => 
        {
            Promise.all([
                this._commonService.getAllActiveChild(),
                this._commonService.getAllImmunisationType(),
                this._commonService.getAllImmunisationTracking(),
            ])
                .then(([children, immunisation, immunisationTracker]: [Child[], Immunisation[], ImmunisationTracker[]]) => {

                    this.immunisationTable = []

                    for (const child of children) 
                    {
                        if (!child.isActive() || !child.immunisationTracking) continue;

                        const newGroupReminder: NewGroupReminder[] = [];

                        let scheduleItem: ReminderSchedule[] = [];

                        for (const item of immunisation)
                        {
                            scheduleItem = [];
                            for(const slot of item.schedule) {

                                let tracker: ImmunisationTracker;
                                let trackingDate: string;
                                let status: string;

                                trackingDate = slot.getTrackingDate(child);
                                tracker = immunisationTracker.length > 0? immunisationTracker.find(v=> v.schedule.id === slot.id && v.child.id === child.id): null;

                                if(tracker) {
                                    continue
                                }
                                if(!tracker && differenceInCalendarDays(parseISO(trackingDate),new Date()) > 30) {

                                    continue;

                                }

                                if(!tracker && differenceInCalendarDays(parseISO(trackingDate), new Date()) < 1){

                                    status = 'pastDue';
                                }

                                else if(!tracker && differenceInCalendarDays(parseISO(trackingDate),new Date()) <= 30) {

                                    status = 'dueSoon'
                                }

                                scheduleItem.push({
                                    immunisation: item,
                                    schedule: slot,
                                    status: status,
                                    trackingDate: slot.getTrackingDate(child),
                                    tracker: immunisationTracker.length > 0? immunisationTracker.find(v=> v.schedule.id === slot.id) : null
                                })
                            }

                            if (scheduleItem.length < 1){
                                continue;
                            }
                            newGroupReminder.push({
                                past: scheduleItem.filter(v => v.status === 'pastDue').length,
                                near: scheduleItem.filter(v => v.status === 'dueSoon').length,
                                immunisation: item,
                                date: ''
                            })

                        }

                        if (newGroupReminder.length < 1) continue;

                        this.immunisationTable.push({
                            child: child,
                            reminderDataFirst: newGroupReminder.slice(0, 3),
                            reminderDataMore: newGroupReminder.slice(3, newGroupReminder.length),
                            expand: false
                        })

                    }

                    resolve();
                })
                .catch(errorResponse => {
                    reject(errorResponse);
                });
        });
    }

    getChildProfileImage(item: any) : string
    {
        if(item.image)
        {
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        }
        else
        {
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
        }
    }

    toggleMoreDetails(e: MouseEvent, item: NewReminderItems): void
    {
        e.preventDefault();

        e.stopPropagation();

        item.expand = !item.expand;
    }

    updateExpand(e: MouseEvent): void
    {
        e.preventDefault();

        for(const item of this.immunisationTable) 
        {
            item.expand = false;
        }
    }

    openChildImmunisation(e: MouseEvent, child: Child): void
    {
        e.preventDefault();

        this._router.navigate(['/manage-children', 'child', child.id, 'immunisation'])
    }

    getStaffProfileImage(item: any) : string
    {
        return (item.image) ? this._commonService.getS3FullLinkforProfileImage(item.image) : AppConst.image.PROFILE_CALLBACK;
    }

    getBranchLogo(): string
    {
        return (this.centerSettingsData.branch_logo) ? this._commonService.getS3FullLink(this.centerSettingsData.branch_logo) : `assets/images/logos/KMLOGO.png`;
    }
}
