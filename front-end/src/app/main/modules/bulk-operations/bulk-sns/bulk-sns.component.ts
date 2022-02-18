import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { resolve } from 'path';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Branch } from '../../branch/branch.model';
import { Child } from '../../child/child.model';
import { User } from '../../user/user.model';
import { BulkSNSService } from './bulk-sns.service';
import { ScriptDialogComponent } from './Dialog/script-dialog/script-dialog.component';

@Component({
  selector: 'app-bulk-sns',
  templateUrl: './bulk-sns.component.html',
  styleUrls: ['./bulk-sns.component.scss'],
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
]
})
export class BulkSnsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    organizations: Organization[];
    branches: Branch[];
    buttonLoader: boolean;
    pageLoading: boolean;
    snsForm: FormGroup;
    child: Child[];
    user: User[];
    importModal: NzModalRef;

  constructor(
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _bulkSNSService: BulkSNSService,
        private _notificationService: NotificationService
    )
    {
        // set default values
        this.organizations = [];
        this.buttonLoader = false;
        this.branches = [];
        this.user = [];
        this.child = [];

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.snsForm = this.createForm();
    }

  ngOnInit() {

    this._bulkSNSService
            .onDependsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => this.organizations = data);

            // Subscribe to form value changes
        this.snsForm
        .get('org')
        .valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(val => 
            {
                this.snsForm.get('branch').patchValue(null);

                this.branches = this.getBranches(val);
            }
        );

        this.snsForm
        .get('type')
        .valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(val => 
            {
                if(this.fc.branch.value){
                    if(val){
                        if(this.fc.type.value === 'CHILD'){
                            this.loadChildData();
                        }
        
                        if(this.fc.type.value === 'USER'){
                            this.loadUserData();
                        }
                    }
                }
            }
        );
        this.snsForm
        .get('branch')
        .valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(val => 
            {
                if(this.fc.type.value){
                    if(val){
                        if(this.fc.type.value === 'CHILD'){
                            this.loadChildData();
                        }
        
                        if(this.fc.type.value === 'USER'){
                            this.loadUserData();
                        }
                    }
                }
            }
        );

  }

  getBranches(value: string): any
    {
        return (value && !_.isEmpty(this.organizations.find(i => i.id === value))) ? this.organizations.find(i => i.id === value).branch : [];
    }

  get fc(): any 
    { 
        return this.snsForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            org: new FormControl(null, [Validators.required]),
            branch: new FormControl(null, [Validators.required]),
            type: new FormControl(null, [Validators.required]),
        });
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

  ngOnDestroy(): void
    {

        this._bulkSNSService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.snsForm.invalid)
        {
            return;
        }

        this.buttonLoader = true;

        if(this.fc.type.value === 'CHILD'){
            this._bulkSNSService
            .syncChild(this.fc.branch.value)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {
                    this._notificationService.clearSnackBar();

                    setTimeout(() => this._notificationService.displaySnackBar(res, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
        }
        if(this.fc.type.value === 'USER'){
            this._bulkSNSService
            .syncUser(this.fc.branch.value)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {
                    this._notificationService.clearSnackBar();

                    setTimeout(() => this._notificationService.displaySnackBar(res, NotifyType.SUCCESS), 200);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
        }
        
            
    }

    loadChildData(){
        this.pageLoading = true;
        return new Promise<void>((resolve, reject) =>
        {
            const sendObj = {
                branch: this.fc.branch.value
            }
            Promise.all([
                this._bulkSNSService.getChildByBranch(this.fc.branch.value).toPromise(),
            ])
            .then(([child]: [Child[]]) => 
            {
                console.log('child', child);
                
                this.child = child;
                this.pageLoading = false;
                resolve();
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    loadUserData(){
        return new Promise<void>((resolve, reject) =>
        {
            const sendObj = {
                branch: this.fc.branch.value
            }
            Promise.all([
                this._bulkSNSService.getUserByBranch(this.fc.branch.value).toPromise(),
            ])
            .then(([user]: [User[]]) => 
            {
                console.log('user', user);
                this.user = user;
                resolve();
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.buttonLoader)
        {
            return;
        }

        this.importModal = this._modalService
            .create({
                nzTitle: 'Petty Cash Script',
                nzContent: ScriptDialogComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'get-import-petty-cash-script',
                nzComponentParams: {
                    organizations: this.organizations
                },
                nzFooter: [
                    {
                        label: 'IMPORT',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.form.valid),
                        onClick: componentInstance => {
                            const selectedOrg = componentInstance.getOrg();

                            console.log(selectedOrg);
                            
                            this._bulkSNSService.runScript(selectedOrg)
                            .subscribe(res=> {
                                setTimeout(() => this._notificationService.displaySnackBar(res, NotifyType.SUCCESS), 200);
                                this.importModal.destroy();
                            });
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.importModal.destroy()
                    }
                ]
            });
    }

}
