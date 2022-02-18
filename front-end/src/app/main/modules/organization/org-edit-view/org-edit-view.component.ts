import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog } from '@angular/material/dialog';

import { OrganizationService } from '../services/organization.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { OrganizationViewResolverService } from '../services/organization-view-resolver.service';

import { Organization } from '../Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { NewOrEditComponent } from '../dialogs/new-or-edit/new-or-edit.component';

@Component({
    selector: 'organization-edit-view',
    templateUrl: './org-edit-view.component.html',
    styleUrls: ['./org-edit-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class OrgEditViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    buttonLoader: boolean;

    organization: Organization;
    branches: any;
    admins: any;
    current: number;
    tabViewItem: number | null;

    // hardcoded for children amounts
    amount = 45;
    dialogRef: any;

    /**
     * 
     * @param {Router} _router 
     * @param {ActivatedRoute} route 
     */
    constructor(
        private _router: Router,
        private _logger: NGXLogger,
        private route: ActivatedRoute,
        private _matDialog: MatDialog,
        private _organizationService: OrganizationService,
        private _organizationEditViewService: OrganizationViewResolverService,
        private _notification: NotificationService,
       
    ) {
        // Set the private defaults
        this.buttonLoader = false;
        this.branches = [];
        this.admins = [];
        this.current = 0;
        this.tabViewItem = null;

        this._unsubscribeAll = new Subject();
    }


    /**
     * On Init
     */
    ngOnInit(): void 
    {
        // Subscribe to organization change
        this._organizationEditViewService
            .onOrganizationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Organization) => 
            {
                this._logger.debug('[organization]', response);

                this.organization = response;
            });

        // Subscribe to tab loader changes
        this._organizationService
            .onOrgTabViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: number) => this.tabViewItem = value);
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
     * tab navigation previous
     */
    pre(): void
    {
        this.current -= 1;
    }

    /**
     * tab navigation new
     */
    next(): void
    {
        this.current += 1;
    }
    
    /**
     * update tab navigation position
     */
    updatePosition(index: number): void
    {   
        this.current = index;
    }

    /**
     * On Back
     * @param e 
     */
    onBack(e: MouseEvent): void 
    {
        e.preventDefault();

        this._router.navigate(['/manage-subscription']);
    }

    /**
     * Edit organization (custom plan details)
     * @param item 
     * @param e 
     */
    editDialog(item: Organization, e: MouseEvent): void 
    {
        e.preventDefault();

        this._organizationService.onTableLoaderChanged.next(true);

        this._organizationService.getDependency(),
            this._organizationService.getOrganization(item.id)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this._organizationService.onTableLoaderChanged.next(false), 200))
                )
                .subscribe(
                    (organization) => {
                        this.dialogRef = this._matDialog
                            .open(NewOrEditComponent,
                                {
                                    panelClass: 'org-new-or-edit-dialog',
                                    closeOnNavigation: true,
                                    disableClose: true,
                                    autoFocus: false,
                                    data: {
                                        action: AppConst.modalActionTypes.EDIT,
                                        response: {
                                            organization: organization
                                        }
                                    }
                                });

                        this.dialogRef
                            .afterClosed()
                            .subscribe(message => {
                                if (!message) {
                                    return;
                                }

                                this._notification.clearSnackBar();

                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            });
                    },
                    error => {
                        throw error;
                    }
                );
    }


}
