import { Component, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, AfterViewInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BookingRequestService } from '../../../services/booking-request.service';
import { AuthService } from 'app/shared/service/auth.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Fee, FeeCollection } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { AuthClient } from 'app/shared/model/authClient';
import { AppConst } from 'app/shared/AppConst';
import { BookingRequest } from 'app/main/modules/child/booking-request/booking-request.model';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Child } from 'app/main/modules/child/child.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'booking-request-action',
    templateUrl: './action.component.html',
    styleUrls: ['./action.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingRequestActionComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    private _sideBar = 'booking-request-action-sidebar';

    client: AuthClient;
    fees: Fee[];
    rooms: Room[];
    children: Child[];
    filteredFees: Fee[];

    actionForm: FormGroup;

    buttonLoader: boolean;

    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;

    confirmModal: NzModalRef;

    @Input() 
    selected: BookingRequest;

    @Input() 
    preview: Array<any>;

    @Input() 
    errorType: { code: number, message: string };

    @Input()
    absReasons: any;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _cdr: ChangeDetectorRef,
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _requestService: BookingRequestService,
        private _fuseSidebarService: FuseSidebarService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.rooms = [];
        this.fees = [];
        this.filteredFees = [];
        this.buttonLoader = false;
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.actionForm = this.createForm();

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
        this._logger.debug('booking request action sidebar !!!', this.selected);

        // Subscribe to booking request dependency changes
        this._requestService
            .onDependencyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[booking request]', response);

                this.rooms = response.rooms;
                this.fees = response.fees;

                this._cdr.markForCheck();
            });
    }

    /**
     * Respond after initializes the component's views
     */
    ngAfterViewInit(): void 
    {
        // Subscribe to sidebar toggle changes
        this._fuseSidebarService
            .getSidebar(this._sideBar)
            .openedChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (value)
                {
                    this.updateListScroll();

                    this.setFormValues();
                } 
                else
                {
                    setTimeout(() => 
                    {
                        this.clearFormValues();

                        this.scrollToTop();
                    }, 250);
                }
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.actionForm.controls; 
    }

    /**
     * update scroll bar
     *
     */
    updateListScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * scroll bar to top
     *
     */
    scrollToTop(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.scrollToTop();
        }
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            date: new FormControl(null, [Validators.required]),
            date_range: new FormControl(null, [Validators.required]),
            room: new FormControl(null, [Validators.required]),
            fees: new FormControl(null, [Validators.required]),
            late_time: new FormControl(null, [Validators.required]),
            late_desc: new FormControl(null, []),
            absence: new FormControl(null, []),
            absent_document_held: new FormControl(false, [])
        });
    }
    
    /**
     * filter fees by room
     *
     * @param {*} value
     */
    selectFeeOnRoomChange(value: any): void
    {
        this.actionForm.get('fees').patchValue(null, { emitEvent: false });
        this.actionForm.get('fees').markAsPristine();
        this.actionForm.get('fees').markAsUntouched();
        this.actionForm.get('fees').updateValueAndValidity();

        if (!_.isNull(value))
        {
            const fees: Fee[] = this.getFeeSource(this.selected.isCasual()).filter(i => i.rooms.filter(r => r.id === value).length > 0);
            
            this.filteredFees = _.isEmpty(fees) ? this.getFeeSource(this.selected.isCasual()) : fees;
        }
        else
        {
            this.filteredFees = [];
        }
    }

    /**
     * filter fees for casual and standard requests
     *
     * @param {boolean} [casualOnly=false]
     * @returns {Fee[]}
     */
    getFeeSource(casualOnly: boolean = false): Fee[]
    {
        const collection = new FeeCollection(this.fees);

        return (!casualOnly ? collection.onlyRoutine() : collection.onlyCasual()).filter(i => i.hasSession());
    }

    /**
     * get fee information
     *
     * @param {string} id
     * @returns {Fee}
     */
    getFeeInfo(id: string): Fee
    {
        return this.fees.find(i => i.id === id);
    }

    /**
     * get room information
     *
     * @param {string} id
     * @returns {Room}
     */
    getRoomInfo(id: string): Room
    {
        return this.rooms.find(i => i.id === id);
    }

    /**
     * check if room linked with child
     *
     * @param {Room} room
     * @returns {boolean}
     */
    isRoomLinked(room: Room): boolean
    {
        return this.selected.child.rooms.filter(r => r.id === room.id).length > 0;
    }

    /**
     * preview information
     *
     * @returns {{ ok: number, conflict: number }}
     */
    getPreviewHeader(): { ok: number, conflict: number }
    {
        return {
            ok: this.preview.filter(i => !i.disabled).length,
            conflict: this.preview.filter(i => i.disabled).length
        }
    }

    /**
     * select all items
     *
     * @param {boolean} value
     * @returns {void}
     */
    checkAllPreviews(value: boolean): void
    {
        if (_.isEmpty(this.preview))
        {
            return;
        }

        this.preview
            .filter((i: { disabled: boolean; }) => !i.disabled)
            .forEach((i: { selected: boolean; }) => i.selected = value);

        this.refreshPreviewStatus();
    }

    /**
     * get selected preview slot items
     */
    getSelectedPreviewSlotItems(): any
    {
        return this.preview.filter((i: { disabled: boolean; selected: boolean; }) => !i.disabled && i.selected);
    }

    /**
     * check if booking preview slots selected
     */
    hasPreviewSlotSelected(): boolean
    {
        return this.selected && this.selected.hasEndDate() ? this.getSelectedPreviewSlotItems().length > 0 : true;
    }

    /**
     * check preview booking slots selected
     */
    refreshPreviewStatus(): void
    {
        this.isAllPreviewDataChecked = this.preview
            .filter((i: { disabled: boolean; }) => !i.disabled)
            .every((i: { selected: boolean; }) => i.selected);
        
        this.isPreviewIndeterminate = this.preview.filter(i => !i.disabled).some(i => i.selected) && !this.isAllPreviewDataChecked;
    }

    /**
     * set form value
     *
     */
    setFormValues(): void
    {
        try 
        {   
            this.actionForm.get('date').clearValidators();
            this.actionForm.get('date').patchValue(null, { emitEvent: false });
            this.actionForm.get('date').updateValueAndValidity();
            this.actionForm.get('date').reset();

            this.actionForm.get('date_range').clearValidators();
            this.actionForm.get('date_range').patchValue(null, { emitEvent: false });
            this.actionForm.get('date_range').updateValueAndValidity();
            this.actionForm.get('date_range').reset();

            this.actionForm.get('late_time').clearValidators();
            this.actionForm.get('late_time').patchValue(null, { emitEvent: false });
            this.actionForm.get('late_time').updateValueAndValidity();
            this.actionForm.get('late_time').reset();

            this.actionForm.get('absence').clearValidators();
            this.actionForm.get('absence').patchValue(null, { emitEvent: false });
            this.actionForm.get('absence').updateValueAndValidity();
            this.actionForm.get('absence').reset();
            
            if (this.selected.hasEndDate())
            {
                this.actionForm.get('date_range').setValidators([Validators.required]);

                this.actionForm.get('date_range').patchValue([ DateTimeHelper.parseMoment(this.selected.date).toDate(), DateTimeHelper.parseMoment(this.selected.endDate).toDate() ]);
            }
            else
            {
                this.actionForm.get('date').setValidators([Validators.required]);

                this.actionForm.get('date').patchValue(DateTimeHelper.parseMoment(this.selected.date).toDate());

                if (this.selected.isAbsence())
                {
                    this.actionForm.get('absence').setValidators([Validators.required]);
                }
            }

            this.actionForm.get('room').patchValue((this.selected.isCasual() ? this.selected.child.rooms : this.rooms).filter(i => i.id === this.selected.room.id).length > 0 ? this.selected.room.id : null);
            this.actionForm.get('fees').patchValue(this.selected.fee.id);

            if (this.selected.isLateType())
            {
                this.actionForm.get('late_time').setValidators([Validators.required]);

                this.actionForm.get('late_time').patchValue(this.selected.lateTime);
                this.actionForm.get('late_desc').patchValue(this.selected.lateDesc);
            }

            if (this.selected.isAbsence())
            {
                this.actionForm.get('absence').patchValue(_.head(Object.keys(this.absReasons)));
            }
        } 
        catch (error) 
        {
            console.error(error);
        }
    }
    
    /**
     * clear for values
     *
     */
    clearFormValues(): void
    {
        this.actionForm.reset();

        this.actionForm.get('date').patchValue(null)
        this.actionForm.get('room').patchValue(null);
        this.actionForm.get('fees').patchValue(null);
        this.actionForm.get('absence').patchValue(null);
        this.actionForm.get('absent_document_held').patchValue(false);

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        } 

        this.preview = [];
    }

    /**
     * close side bar
     *
     * @param {MouseEvent} e
     */
    close(e: MouseEvent): void
    {
        e.preventDefault();

        this._fuseSidebarService.getSidebar(this._sideBar).close();
    }

    /**
     * update booking request changes
     *
     * @param {MouseEvent} e
     */
    update(e: MouseEvent, option: string = '0'): void
    {
        e.preventDefault();

        if (this.buttonLoader || !this.hasPreviewSlotSelected())
        {
            return;
        }

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.UPDATE.TITLE,
                    nzContent: AppConst.dialogContent.UPDATE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzAutofocus: null,
                    nzOkText: 'Yes',
                    nzOkType: 'primary',
                    nzOnOk: () => 
                    {
                        const sendObj = {
                            id: this.selected.id,
                            action: option
                        }
                
                        if (this.selected.hasEndDate())
                        {
                            sendObj['start'] = DateTimeHelper.getUtcDate(_.head(this.fc.date_range.value));
                            sendObj['end'] = DateTimeHelper.getUtcDate(_.last(this.fc.date_range.value));
                            sendObj['slots'] = this.getSelectedPreviewSlotItems()
                                .map((obj: any) => ({...obj}))
                                .map((i: { linked_rooms: any; child: { rooms: { id: string; }[]; id: any; }; adjusted_fee: string, fee: string; }) => 
                                {
                                    i.linked_rooms = i.child.rooms.map((r: { id: string; }) => r.id);
                                    i.child = i.child.id;
                                    i.adjusted_fee = (this.getFeeInfo(i.fee) && !_.isNull(this.getFeeInfo(i.fee).getCurrentAdjusted())) ? this.getFeeInfo(i.fee).getCurrentAdjusted().id : null;
                                    return i;
                                })
                        }
                        else
                        {
                            sendObj['date'] = DateTimeHelper.getUtcDate(this.fc.date.value);
                            sendObj['room'] = this.fc.room.value;
                            sendObj['fee'] = this.fc.fees.value;

                            if (this.getFeeInfo(this.fc.fees.value) && !_.isNull(this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted()))
                            {
                                sendObj['adjust_fee_id'] = this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted().id;
                            }
                        }
                
                        if (this.selected.isLateType())
                        {
                            sendObj['late_time'] = this.fc.late_time.value;
                            sendObj['late_desc'] = this.fc.late_desc.value;
                        }

                        if (this.selected.isAbsence())
                        {
                            sendObj['abs_reason'] = this.fc.absence.value;
                            sendObj['abs_doc_held'] = this.fc.absent_document_held.value;
                        }
                
                        this._logger.debug('[booking request submit]', sendObj);
                
                        this.buttonLoader = true;
                
                        this._requestService
                            .bookingRequestAction(sendObj)
                            .pipe(
                                takeUntil(this._unsubscribeAll),
                                finalize(() => 
                                {
                                    this.buttonLoader = false;
                
                                    this._cdr.markForCheck();
                                })
                            )
                            .subscribe(
                                message => 
                                {
                                    this._fuseSidebarService.getSidebar(this._sideBar).close();
                
                                    this._notification.clearSnackBar();
                
                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                },
                                error =>
                                {
                                    throw error;
                                }
                            );
                    },
                }
            );
    }
}

