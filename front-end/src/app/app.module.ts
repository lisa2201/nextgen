import { NgModule, APP_INITIALIZER, Injector, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, take, finalize } from 'rxjs/operators';
import 'hammerjs';

import { RippleGlobalOptions, MAT_RIPPLE_GLOBAL_OPTIONS } from '@angular/material/core';

import { LoggerModule, NgxLoggerLevel, NGXLogger } from 'ngx-logger';

import { environment } from 'environments/environment';

import { FuseModule } from '@fuse/fuse.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { FuseSidebarModule, FuseThemeOptionsModule } from '@fuse/components';

import { fuseConfig } from 'app/config';

import { NZ_I18N, en_US, NZ_DATE_CONFIG } from 'ng-zorro-antd'; 
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzNotificationModule } from 'ng-zorro-antd/notification';

import { CustomPreloading } from './shared/CustomPreloading';

import { HttpErrorInterceptor } from './shared/interceptor/http-error.interceptor';
import { ProfilerInterceptor } from './shared/interceptor/profiler.interceptor';
import { AuthInterceptor } from './shared/interceptor/auth.interceptor';
import { RefreshTokenCheckerInterceptor } from './shared/interceptor/refresh-token.interceptor';

import { MetaModule, MetaLoader, MetaStaticLoader, PageTitlePositioning } from '@ngx-meta/core';

import { GlobalErrorHandler } from './shared/errors-handler/errors-handler';

import { NgProgressModule } from 'ngx-progressbar';
import { NgProgressRouterModule } from 'ngx-progressbar/router';
import { NgProgressHttpModule } from 'ngx-progressbar/http';

import { NgxWebstorageModule}  from 'ngx-webstorage';

import { MatDialogModule } from '@angular/material/dialog';
import { MatMomentDateModule } from '@angular/material-moment-adapter';

import { LayoutModule } from 'app/layout/layout.module';
import { CommonModule } from './main/common/common.module';
import { ServiceWorkerModule } from '@angular/service-worker';

import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './shared/service/auth.service';
import { ConnectionServiceOptions, ConnectionServiceOptionsToken } from './shared/service/connection.service';

import { LazyLoadImageModule, scrollPreset } from 'ng-lazyload-image'

import { APP_ROUTES } from './app.routes';
import { CommonHelper } from './utils/common.helper';

import { AppComponent } from 'app/app.component';

const globalRippleConfig: RippleGlobalOptions = { disabled: true };

/**
 * default fallback for meta tag
 *
 * @export
 * @returns {MetaLoader}
 */
export function metaFactory(translate: TranslateService): MetaLoader 
{
    return new MetaStaticLoader(
        {
            callback: (key: string) => translate.get(key),
            pageTitlePositioning: PageTitlePositioning.PrependPageTitle,
            pageTitleSeparator: ' - ',
            applicationName: 'KINDER M8 2020',
            defaults: {
                title: 'KINDER M8 KINDLES LEARNING AND DEVELOPMENT',
                description: 'Tech tools tailored to the need of your centre',
            }
        }
    );
}

/**
 * initial state
 *
 * @export
 * @param {Injector} injector
 * @returns {*}
 */
export function appInitFactory(injector: Injector): any
{
    return () =>
    {
        return new Promise<any>(async (resolve, reject) =>
        {
            const _logger = injector.get(NGXLogger);
            const _authService = injector.get(AuthService);

            _logger.debug('[appInitFactory]');

            // check for client info
            await _authService.checkClientAccount();
            
            // check for auth user
            if (_authService.isAuthenticated())
            {
                const service = _authService
                    .getAuthUser()
                    .pipe(
                        take(1),
                        catchError(err => 
                        {
                            CommonHelper.errorLog(err);

                            _authService.clearAuthUser();

                            return of(null);
                        }),
                        finalize(() => 
                        {
                            // unsubscribe
                            service.unsubscribe();

                            setTimeout(() => resolve(null), 250);
                        })
                    )
                    .subscribe(data => 
                    {                        
                        if (data && data != null)
                        {
                            _authService.authInitialSetup(Object.assign({}, data));
                        }
                    });
            }
            else
            {
                resolve(null);
            }
        });
    };
}

@NgModule({
    declarations: [
        AppComponent
    ],
    imports     : [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,

        RouterModule.forRoot(APP_ROUTES, { preloadingStrategy: CustomPreloading }),

        ServiceWorkerModule.register('ngsw-worker.js', { enabled: false }),

        TranslateModule.forRoot(),

        LoggerModule.forRoot({
            level: !environment.production ? NgxLoggerLevel.DEBUG : NgxLoggerLevel.OFF,
            serverLogLevel: NgxLoggerLevel.OFF
        }),

        // MatButtonModule,
        // MatIconModule,
        MatMomentDateModule,
        MatDialogModule,

        NzMessageModule,
        NzNotificationModule,

        FuseModule.forRoot(fuseConfig),
        FuseSharedModule,
        FuseSidebarModule,
        FuseThemeOptionsModule,

        LayoutModule,

        CommonModule,

        NgProgressModule.withConfig({
            debounceTime: 100,
            speed: 300,
            color: '#377FEA',
            thick: false,
            spinner: false
        }),
        
        // NgProgressRouterModule,
        // NgProgressHttpModule.withConfig({
        //     id: 'apiProgress'
        // }),

        MetaModule.forRoot({
            provide: MetaLoader,
            useFactory: metaFactory,
            deps: [ TranslateService ]
        }),

        LazyLoadImageModule.forRoot({
            preset: scrollPreset
        }),

        NgxWebstorageModule.forRoot({ prefix: '', separator: '', caseSensitive: true })
    ],
    providers : [
        {
            provide: NZ_I18N,
            useValue: en_US
        },
        {
            provide: APP_INITIALIZER,
            useFactory: appInitFactory,
            deps: [Injector],
            multi: true
        },
        CustomPreloading,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HttpErrorInterceptor,
            multi: true
        },
        GlobalErrorHandler,
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ProfilerInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: RefreshTokenCheckerInterceptor,
            multi: true
        },
        {
            provide: MAT_RIPPLE_GLOBAL_OPTIONS, 
            useValue: globalRippleConfig
        },
        {
            provide: NZ_DATE_CONFIG,
            useValue: {
                firstDayOfWeek: 1, // week starts on Monday (Sunday is 0)
            },
        },
        {
            provide: ConnectionServiceOptionsToken,
            useValue: <ConnectionServiceOptions> {
                enableHeartbeat: false,
                heartbeatUrl: '/assets/ping.txt',
                requestMethod: 'options',
                heartbeatInterval: 10000
            }
          }
    ],
    bootstrap   : [
        AppComponent
    ]
})
export class AppModule
{
}
