import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildrenService } from '../../services/children.service';

import { Child } from '../../child.model';

import { AppConst } from 'app/shared/AppConst';
import { Room } from 'app/main/modules/room/models/room.model';

import { ChildSetRoomComponent } from '../../modals/set-room/set-room.component';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../../shared/service/notification.service';

@Component({
    selector: 'child-view-rooms-view',
    templateUrl: './rooms-view.component.html',
    styleUrls: ['./rooms-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildViewRoomsViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    buttonLoader: boolean;
    setRoomModal: NzModalRef;
    confirmModal: NzModalRef;

    @Input() selected: Child;

    @Output()
    updateScroll: EventEmitter<any>;

    @Output()
    updateSelected: EventEmitter<any>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
    )
    {
        // set default values
        this.buttonLoader = false;
        this.updateScroll = new EventEmitter();
        this.updateSelected = new EventEmitter();

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
        this._logger.debug('child view - user list !!!');
        // Initial reference
        this.child = this.selected;

        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild => this.child = (!currentChild) ? null : currentChild);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateScroll.unsubscribe();
        this.updateSelected.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * add room to child
     *
     * @param {MouseEvent} e
     */
    addRoom(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        this.selected.rooms.map(i => i.isLoading = true);
        
        this._childrenService
            .getRooms()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    this.selected.rooms.map(i => i.isLoading = false);

                    setTimeout(() => this.buttonLoader = false, 100);
                })
            )
            .subscribe(response =>
            {
                this._logger.debug('[get rooms]', response);

                this.setRoomModal = this._modalService
                    .create({
                        nzTitle: 'Select Room',
                        nzContent: ChildSetRoomComponent,
                        nzMaskClosable: false,
                        nzComponentParams: {
                            rooms: response.filter((i: { id: string; }) => _.findIndex(this.selected.rooms, ['id', i.id]) === -1)
                        },
                        nzWrapClassName: 'custom-search-list',
                        nzFooter: [
                            {
                                label: 'SAVE',
                                type: 'primary',
                                disabled: componentInstance => !(componentInstance!.ChildSetRoomForm.valid),
                                onClick: componentInstance =>
                                {
                                    const selectedRoom = componentInstance.getSelectedRoom();

                                    if (!_.isNull(selectedRoom) && !this.selected.rooms.find(i => i.id === selectedRoom.id))
                                    {
                                        this.child.rooms.map(i => i.isLoading = true);

                                        this.buttonLoader = true;

                                        this._childrenService
                                            .updateRoom({
                                                child: this.child.id,
                                                room: selectedRoom.id,
                                                type: AppConst.modalActionTypes.NEW
                                            })
                                            .pipe(
                                                takeUntil(this._unsubscribeAll),
                                                finalize(() =>
                                                {
                                                    setTimeout(() => this.child.rooms.map(i => i.isLoading = false), 50);

                                                    this.buttonLoader = false;
                                                })
                                            )
                                            .subscribe(
                                                message =>
                                                {
                                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                                    this.updateScroll.next();
                                                },
                                                error =>
                                                {
                                                    throw error;
                                                }
                                            );

                                        this.updateSelected.next({
                                            item: selectedRoom,
                                            action: AppConst.modalActionTypes.NEW
                                        });
                                    }

                                    this.setRoomModal.destroy();
                                }
                            },
                            {
                                label: 'CLOSE',
                                type: 'danger',
                                onClick: () => this.setRoomModal.destroy()
                            }
                        ]
                    });
                
                this.setRoomModal
                    .afterOpen
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(() => setTimeout(() => this.setRoomModal.getContentComponent().updateListScroll(), 250));
            });
    }

    /**
     * remove room to child
     *
     * @param {MouseEvent} e
     */
    removeRoom(item: Room, e: MouseEvent): void
    {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () =>
                    {
                        return new Promise((resolve, reject) =>
                        {
                            item.isLoading = true;

                            this.buttonLoader = true;

                            this._childrenService
                                .updateRoom({
                                    child: this.child.id,
                                    room: item.id,
                                    type: AppConst.modalActionTypes.DELETE
                                })
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() =>
                                    {
                                        this.buttonLoader = false;
                                        this.updateSelected.next({
                                            item: item,
                                            action: AppConst.modalActionTypes.DELETE
                                        });
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.updateScroll.next();
                                    },
                                    error =>
                                    {
                                        item.isLoading = false;

                                        throw error;
                                    }
                                );
                        });


                    }
                }
            );
    }
}
