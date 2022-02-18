import { Directive, OnInit, OnDestroy, ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../service/auth.service';

@Directive({
    selector: '[canViewAuth]'
})
export class AuthVisibilityCheckDirective implements OnInit, OnDestroy
{
    // Private
    private _unsubscribeAll: Subject<any>;

    isInitialized: boolean;

    /**
     * Constructor
     *
     * @param {ElementRef} _elementRef
     * @param {TemplateRef<any>} _templateRef
     * @param {ViewContainerRef} _viewContainerRef
     * @param {AuthService} _authService
     */
    constructor(
        private _elementRef: ElementRef,
        private _templateRef: TemplateRef<any>,
        private _viewContainerRef: ViewContainerRef,
        private _authService: AuthService
    )
    {
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
        // Subscribe to the user changes
        this._authService
            .currentUser
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateView());
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if ( this.isInitialized )
        {
            this.isInitialized = false;
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    updateView(): void
    {
        if (this._authService.isAuthenticated())
        {
            // Return, if already initialized
            if ( this.isInitialized )
            {
                return;
            }
            
            // Set as initialized
            this.isInitialized = true;

            setTimeout(() => this._viewContainerRef.createEmbeddedView(this._templateRef), 250);
        }
        else
        {
            this._viewContainerRef.clear();

            this.isInitialized = false;
        }
    }

}
