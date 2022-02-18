import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, ViewChild } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { User } from 'app/main/modules/user/user.model';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';


@Component({
    selector: 'child-set-user-modal',
    templateUrl: './set-user.component.html',
    styleUrls: ['./set-user.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildSetUserComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    ChildSetUserForm: FormGroup;
    buttonLoader: boolean;
    searchProperties: string[] = [
        'firstName',
        'lastName',
        'email'
    ];

    @Input() users: User[];

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalRef} _modal
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    )
    {
        // set default values
        this.buttonLoader = false;
        this.ChildSetUserForm = this.createForm();
        
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
        this._logger.debug('child set user modal !!!');

        if (this.users.length < 1)
        {
            this.ChildSetUserForm.disable();
        }
        else
        {
            this.onChanges();
        }
    }

    onChanges(): void
    {
        // Subscribe to search input changes
        this.ChildSetUserForm
            .get('search')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateListScroll());
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

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.ChildSetUserForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            user: new FormControl(null, [Validators.required]),
            search: new FormControl(''),
        });
    }

    /**
     * clear search text
     *
     * @param {MouseEvent} e
     */
    clear(e: MouseEvent): void
    {
        e.preventDefault();

        this.fc.search.patchValue('', { emitEvent: false });
    }

    updateListScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    getSelectedUser(): any
    {
        return (this.ChildSetUserForm.valid) ? this.users.find(i => i.id === this.fc.user.value) : null;
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}
