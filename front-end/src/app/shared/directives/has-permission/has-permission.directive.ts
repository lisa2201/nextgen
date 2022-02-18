import { Directive, OnInit, OnDestroy, ElementRef, TemplateRef, ViewContainerRef, Input, OnChanges, SimpleChanges, ComponentFactoryResolver } from '@angular/core';

import { Subscription, Subject } from 'rxjs';

import { AuthService } from '../../service/auth.service';
import { takeUntil } from 'rxjs/operators';

@Directive({
    selector: '[hasPermission]'
})
export class HasPermissionDirective implements OnInit, OnChanges, OnDestroy
{
    // Private
    private _unsubscribeAll: Subject<any>;

    private permKey: string;
    private permissions: string[];
    private elseTemplate: any;

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
        private _authService: AuthService,
        private _resolver: ComponentFactoryResolver
    )
    {
        // Set defaults
        this.permissions = [];
        this.elseTemplate = null;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    @Input()
    set hasPermission(val: any)
    {
        this.permissions = val;
    }

    @Input()
    set hasPermissionBelongsTo(key: string)
    {
        this.permKey = key.toUpperCase();
    }

    @Input()
    set hasPermissionElse(template: TemplateRef<any>)
    {
        this.elseTemplate = template;
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
     * On Changes
     */
    ngOnChanges(changes: SimpleChanges): void
    {
        const permsChanges = changes['hasPermission'];
        const permsKeyChanges = changes['hasPermissionBelongsTo'];
        const permsElseChanges = changes['hasPermissionElse'];

        if (permsChanges || permsKeyChanges || permsElseChanges)
        {
            // ignore on initial stage
            if (permsChanges && permsChanges.firstChange) { return; }
            if (permsKeyChanges && permsKeyChanges.firstChange) { return; }
            if (permsElseChanges && permsElseChanges.firstChange) { return; }

            this.updateView();
        }
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
        this._authService
            .hasPermission(this.permissions, this.permKey)
            .then((found) =>
            {
                if (found)
                {
                    // Return, if already initialized
                    if ( this.isInitialized )
                    {
                        return;
                    }

                    // Set as initialized
                    this.isInitialized = true;

                    this._viewContainerRef.createEmbeddedView(this._templateRef);
                }
                else
                {
                    this._viewContainerRef.clear();

                    this.isInitialized = false;

                    // attach else template
                    if (this.elseTemplate && this.elseTemplate !== null)
                    {
                        this._viewContainerRef.createEmbeddedView(this.elseTemplate);
                    }
                }
            });
    }

}
