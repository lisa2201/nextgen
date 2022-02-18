import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { PermissionService } from '../services/permission.service';

import { Permission } from '../permission.model';

@Component({
    selector: 'permission-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PermissionListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    permissions: Permission[];
    resources: any;
    tableLoading: boolean;
    buttonLoader: boolean;
    permissionTableData: any;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _permsService: PermissionService
    )
    {
        // set default values
        this.tableLoading = false;
        this.buttonLoader = false;
        this.permissionTableData = [];

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
        this._logger.debug('permission - list view !!!');

        // Subscribe to resource changes
        this._permsService
            .onResourceChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((items: any) => this.resources = items);

        // Subscribe to permission changes
        this._permsService
            .onPermissionsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((items: Permission[]) => 
            { 
                this.permissions = items; 

                setTimeout(() => this.buildPermissionTable(), 50);
            });

        // Subscribe to table loader changes
        this._permsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.tableLoading = value);
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
     * build table content
     */
    buildPermissionTable(): void
    {
        // resource list
        const list: Array<any> = this.resources.reduce((results: any, resource: any) => 
        {
            (results[resource.type] = results[resource.type] || []).push(resource);

            return results;
        }, []);

        // table list
        this.permissionTableData = Object.entries(this.permissions.reduce((results: any, permission: Permission) => 
        {
            (results[permission.type] = results[permission.type] || []).push(permission);

            return results;
        }, {}))
        .map((k: any, i) => 
        {
            // add missing permission
            if(k[1].length !== list[k[0]].length)
            {
                for (const perm of list[k[0]])
                {
                    if (_.findIndex(k[1], (item: any) => item.navReference === perm.navigation_ref_id && item.slug === perm.perm_slug && item.type === perm.type) < 0)
                    {
                        const item = new Permission({
                            name: perm.display_name,
                            level: perm.name,
                            file: perm.file,
                        });

                        item.isNew = true;

                        k[1].push(item);
                    }
                } 
            }
            // check for any updates in properties
            else
            {
                for (const resource of list[k[0]])
                {
                    const index = _.findIndex(k[1], (item: any) => item.navReference === resource.navigation_ref_id && item.slug === resource.perm_slug && item.type === resource.type);

                    if (index > -1 && k[1][index] 
                        && (resource.name !== k[1][index].groupName 
                        || !_.isEmpty(_.difference(resource.access_level, k[1][index].group)) 
                        || resource.display_name !== k[1][index].name))
                    {
                        k[1][index].file = resource.file;

                        k[1][index].isNew = true;

                        k[1][index].isUpdate = true;
                    }
                }
            }
            
            return {
                name: k[0],
                list: k[1],
                expand: false 
            };
        });
    }

    /**
     * check if permission has error
     *
     * @param {Permission[]} perms
     * @returns {boolean}
     */
    hasConflicts(perms: Permission[]): boolean
    {
        return perms.filter(i => i.isNew).length > 0;
    }

    /**
     * get permission data errors
     */
    getErrors(): any
    {
        return this.permissionTableData.filter((i: any) => i.list.filter((p: Permission) => p.isNew).length > 0)
    }

    /**
     * check if table has error
     *
     * @returns {boolean}
     */
    hasError(): boolean
    {
        return this.getErrors().length > 0;
    }

    /**
     * Refresh list
     *
     * @param {MouseEvent} e
     * @memberof PermissionListViewComponent
     */
    refreshList(e: MouseEvent): void
    {
        e.preventDefault();

        this._permsService.onUpdateSuccess.next(true);
    }
}
