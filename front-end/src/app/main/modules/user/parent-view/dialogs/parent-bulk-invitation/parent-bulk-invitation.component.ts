import { Component, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NotificationService } from 'app/shared/service/notification.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { slideMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'parent-bulk-invitation',
  templateUrl: './parent-bulk-invitation.component.html',
  styleUrls: ['./parent-bulk-invitation.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    slideMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
]
})
export class ParentBulkInvitationComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    parentForm: FormGroup;
    buttonLoader: boolean;
    userList: any;
    initialList: any;
    searchInput: FormControl;
    filterbyLoginAccess: FormControl;
    loginAccessToggle: FormControl;    

    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    previewBookingSlotErrorStatus: string;
    tableLoading: boolean;
    showToggle: boolean;
    expired: any;
    emailed: any;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    
    constructor(
        public matDialogRef: MatDialogRef<ParentBulkInvitationComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _userService: UsersService,
        private _router: Router,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[parent data]', _data);

        // Set the defaults
        this.buttonLoader = false;
        this.dialogTitle = 'Send Invitation';
        this.initialList = _data.user;
        this.userList = _data.user;
        this.expired = _.map(this.userList.filter(user=> user.isExpired));
        this.emailed = _.map(this.userList.filter(user=> !user.isExpired && user.expires));
        this.searchInput = new FormControl({ value: null, disabled: false });        
        this.filterbyLoginAccess = new FormControl({ value: false, disabled: false });
        this.loginAccessToggle = new FormControl({ value: false, disabled: false });

        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        this.tableLoading = false;
        this.showToggle = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

      /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('parent add view !!!');
    }

    checkAllPreviews(value: boolean): void
    {
        if (_.isEmpty(this.userList))
        {
            return;
        }

        this.userList
            .filter((i: { disabled: boolean; }) => !i.disabled)
            .forEach((i: { selected: boolean; }) => i.selected = value);

        this.refreshPreviewStatus();
    }

    refreshPreviewStatus(): void
    {
        this.isAllPreviewDataChecked = this.userList
            .filter((i: { disabled: boolean; }) => !i.disabled)
            .every((i: { selected: boolean; }) => i.selected);
        
        this.isPreviewIndeterminate = this.userList.filter(i => !i.disabled).some(i => i.selected) && !this.isAllPreviewDataChecked;

        this.previewBookingSlotErrorStatus = !this.hasPreviewSlotSelected() ? 'error' : '';
    }

    hasPreviewSlotSelected(): boolean
    {
        return this.getSelectedPreviewSlotItems().length > 0;
    }

    getSelectedPreviewSlotItems(): any
    {
        return this.userList.filter((i: { disabled: boolean; selected: boolean; }) => !i.disabled && i.selected);
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    clearSearch(e: MouseEvent, _emit: boolean = true): void 
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    reloadTable(): void 
    {
        // this.onTableChange(false);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.updateScroll();

        this.userList = [];

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        const sendObj = {
            slots: this.getSelectedPreviewSlotItems()
                .map(obj => ({...obj}))
                .map(i => 
                {
                    i = i.id;
                    return i;
                })
        };

        this._logger.debug('[bulk invitation object]', sendObj);

        this.buttonLoader = true;

        this._userService
            .sendBulkInvitation(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                message => setTimeout(() => this.matDialogRef.close(message), 250),
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

    getStatus(isExpired: boolean, expireOn: string): string
    {
        return isExpired === false && expireOn !== null? 'Sent (Expiring on ' + DateTimeHelper.parseMoment(expireOn).format('DD-MM-YYYY') + ')': isExpired === true && expireOn !== null? 'expired' : 'Email not sent';
    }

    changeFilterbyStatus(e: MouseEvent): void {

        if(e){
            this.showToggle = true;
            this.loginAccessToggle.patchValue(false, { emitEvent: true });
            this.userList = this.initialList.filter(user=> user.loginAccess === false);
        }else{
            this.showToggle = false;
            this.userList = this.initialList;
        }
    }

    ChangefilterBy(e: MouseEvent): void {
       
        this.userList = this.initialList.filter(user=> user.loginAccess === e);
    }
}
