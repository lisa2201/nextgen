import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Platform } from '@angular/cdk/platform';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { interval, Subject } from 'rxjs';
import { takeUntil, filter, map, mergeMap } from 'rxjs/operators';
import { Router, NavigationStart, NavigationEnd, NavigationError, NavigationCancel, ActivatedRoute } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fadeInOnEnterAnimation, slideOutUpOnLeaveAnimation } from 'angular-animations';

import { FuseConfigService } from '@fuse/services/config.service';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { FuseSplashScreenService } from '@fuse/services/splash-screen.service';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';
import { ConnectionService } from './shared/service/connection.service';
import { VersionCheckService } from './shared/service/version-check.service';

import { locale as navigationEnglish } from 'app/navigation/i18n/en';
import { locale as navigationTurkish } from 'app/navigation/i18n/tr';

import { fuseAnimations } from '@fuse/animations';

import { AuthService } from './shared/service/auth.service';
import { NavigationService } from './shared/service/navigation.service';
import { LocalStorageService } from 'ngx-webstorage';
import { CommonService } from './shared/service/common.service';

import { AppConst } from './shared/AppConst';
import { environment } from 'environments/environment';

import { NgProgressComponent } from 'ngx-progressbar';

// global variable
export let browserRefresh = false;

@Component({
    selector   : 'app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ anchor: 'enter', delay: 150, duration: 300 }),
        slideOutUpOnLeaveAnimation({ anchor: 'leave', delay: 300, duration: 500 })
    ]
})
export class AppComponent implements OnInit, OnDestroy
{
    fuseConfig: any;
    navigation: any;
    viewPageLoader: boolean;
    routeLinks = [];
    hasNetworkConnection: boolean;

    // Private
    private _unsubscribeAll: Subject<any>;

    @ViewChild('normalProgress')
    progressBar: NgProgressComponent;

    @ViewChild('apiProgress')
    apiProgressBar: NgProgressComponent;

    /**
     * Constructor
     * 
     * @param {*} document
     * @param {FuseConfigService} _fuseConfigService
     * @param {FuseNavigationService} _fuseNavigationService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {FuseSplashScreenService} _fuseSplashScreenService
     * @param {FuseTranslationLoaderService} _fuseTranslationLoaderService
     * @param {TranslateService} _translateService
     * @param {Platform} _platform
     * @param {Router} _router
     * @param {ActivatedRoute} _activatedRoute
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     * @param {NavigationService} _navService
     * @param {CommonService} _commonService
     * @param {SwUpdate} _serviceWorker
     * @param {ConnectionService} _connectionService
     * @param {Title} _titleService
     * @param {LocalStorageService} _localStorage
     * @param {VersionCheckService} _versionCheckService
     */
    constructor(
        @Inject(DOCUMENT) private document: any,
        private _fuseConfigService: FuseConfigService,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseSidebarService: FuseSidebarService,
        private _fuseSplashScreenService: FuseSplashScreenService,
        private _fuseTranslationLoaderService: FuseTranslationLoaderService,
        private _translateService: TranslateService,
        private _platform: Platform,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _navService: NavigationService,
        private _commonService: CommonService,
        private _serviceWorker: SwUpdate,
        private _connectionService: ConnectionService,
        private _titleService: Title,
        private _localStorage: LocalStorageService,
        private _versionCheckService: VersionCheckService
    )
    {
        // Get default navigation
        // this.navigation = navigation;

        // Register the navigation to the service
        // this._fuseNavigationService.register('main', this.navigation);

        // Set the main navigation as our current navigation
        // this._fuseNavigationService.setCurrentNavigation('main');

        // Add languages
        this._translateService.addLangs(['en', 'tr']);

        // Set the default language
        this._translateService.setDefaultLang('en');

        // Set the navigation translations
        this._fuseTranslationLoaderService.loadTranslations(navigationEnglish, navigationTurkish);

        // Use a language
        this._translateService.use('en');

        // log service
        this._logger.debug('app start ...');

        /**
         * ----------------------------------------------------------------------------------------------------
         * ngxTranslate Fix Start
         * ----------------------------------------------------------------------------------------------------
         */

        /**
         * If you are using a language other than the default one, i.e. Turkish in this case,
         * you may encounter an issue where some of the components are not actually being
         * translated when your app first initialized.
         *
         * This is related to ngxTranslate module and below there is a temporary fix while we
         * are moving the multi language implementation over to the Angular's core language
         * service.
         */

        // Set the default language to 'en' and then back to 'tr'.
        // '.use' cannot be used here as ngxTranslate won't switch to a language that's already
        // been selected and there is no way to force it, so we overcome the issue by switching
        // the default language back and forth.
        /*
         setTimeout(() => {
            this._translateService.setDefaultLang('en');
            this._translateService.setDefaultLang('tr');
         });
        */

        /**
         * ----------------------------------------------------------------------------------------------------
         * ngxTranslate Fix End
         * ----------------------------------------------------------------------------------------------------
         */

        // Add is-mobile class to the body if the platform is mobile
        if ( this._platform.ANDROID || this._platform.IOS )
        {
            this.document.body.classList.add('is-mobile');
        }

        this.viewPageLoader = false;

        this.hasNetworkConnection = true;

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
        // check service worker updates
        if (this._serviceWorker.isEnabled)
        {
            this._serviceWorker
                .available
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(event =>
                {
                    if (confirm('New version available. Load New Version?'))
                    {
                        this._serviceWorker.activateUpdate().then(() => location.reload());
                    }
                });
        }

        // Subscribe to config changes
        this._fuseConfigService
            .config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: object) =>
            {    
                this.fuseConfig = config;

                // Boxed
                if ( this.fuseConfig.layout.width === 'boxed' )
                {
                    this.document.body.classList.add('boxed');
                }
                else
                {
                    this.document.body.classList.remove('boxed');
                }

                // Color theme - Use normal for loop for IE11 compatibility
                // tslint:disable-next-line: prefer-for-of
                for ( let i = 0; i < this.document.body.classList.length; i++ )
                {
                    const className = this.document.body.classList[i];

                    if ( className.startsWith('theme-') )
                    {
                        this.document.body.classList.remove(className);
                    }
                }

                this.document.body.classList.add(this.fuseConfig.colorTheme);
            });

        // get browser refreshed value
        this._router
            .events
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((event) =>
            {
                if (event instanceof NavigationStart)
                {
                    browserRefresh = !this._router.navigated;
                }
            });
        
        // Subscribe to the router events to show/hide the loading bar
        this._router
            .events
            .pipe(
                filter((event) => event instanceof NavigationStart),
                map(() => this._activatedRoute),
                map((route) => 
                {
                    while (route.firstChild) route = route.firstChild;

                    return route;
                }),
                filter((route) => route.outlet === 'primary'),
                mergeMap((route) => route.data),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((event) =>
            {
                this._logger.debug('NavigationStart', event);

                this.progressBar.start();

                if (this._authService.isAuthenticated())
                {
                    this.viewPageLoader = true;
                }
            });

        this._router
            .events
            .pipe(
                filter((event) => event instanceof NavigationEnd || event instanceof NavigationError || event instanceof NavigationCancel),
                map(() => this._activatedRoute),
                map((route) => 
                {
                    while (route.firstChild) route = route.firstChild;

                    return route;
                }),
                filter((route) => route.outlet === 'primary'),
                mergeMap((route) => route.data),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((event) =>
            {
                this._logger.debug('NavigationEnd', event);
                
                this.progressBar.complete();

                if(!(event && event.disableLoaderAnimation))
                {
                    this.viewPageLoader = false;
                }

                this._titleService.setTitle(event['title']);
            });
        
        // Subscribe to the http request to show/hide the loading bar
        this._commonService
            .onApiProgressBarChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => this.apiProgressBar[value ? 'start' : 'complete']());
        
        // Subscribe to view page loader changes
        this._commonService
            .onPageViewAnimationChange
            .subscribe(value => this.viewPageLoader = value);
        
        // reset content animation event instanceof NavigationEnd || 
        /*this._router
            .events
            .pipe(
                filter((event) => event instanceof NavigationError || event instanceof NavigationCancel),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() =>
            {
                const element = this.document.querySelector('.page-layout');

                if (element)
                {  
                    element.classList.remove('--hide-content');
                }
            });*/

        // connection check
        if (this._authService.isAuthenticated())
        {
            this._connectionService
                .monitor()
                .subscribe(currentState => this.hasNetworkConnection = currentState.hasNetworkConnection && currentState.hasInternetAccess);
        }

        // check for application updates
        if (environment.production && this._authService.isAuthenticated())
        {
            // this._versionCheckService.initVersionCheck(environment.versionCheckURL);
        }

        // check if client information exists else reload the page
        /*if (this._authService.isClientPath())
        {
            this._localStorage
                .observe(AppConst.auth.orgObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((value) => 
                {
                    if (typeof value === 'undefined' && !this._authService.isAuthenticated()) window.location.reload();
                });
        }*/
    }


    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Toggle sidebar open
     *
     * @param key
     */
    toggleSidebarOpen(key: any): void
    {
        this._fuseSidebarService.getSidebar(key).toggleOpen();
    }
}