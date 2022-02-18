import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd, NavigationError, NavigationCancel } from '@angular/router';
import { takeUntil, finalize, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalService, NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion } from 'ng-zorro-antd';

import { ChildrenService } from '../../services/children.service';
import { ChildEnrolmentService } from '../../enrolment/services/enrolment.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../../child.model';
import { Enrolment } from '../../enrolment/models/enrolment.model';

import { ShowEntitlementComponent } from '../../modals/show-entitlement/show-entitlement.component';
import { CommonService } from 'app/shared/service/common.service';
import { AddExistingEnrolmentComponent } from '../../modals/add-existing-enrolment/add-existing-enrolment.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ApproveCwaAdminDialogComponent } from './approve-cwa-admin-dialog/approve-cwa-admin-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'child-details-enrolment-view',
    templateUrl: './enrolment-view.component.html',
    styleUrls: ['./enrolment-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildDetailsEnrolmentViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    filteredSource: Enrolment[];
    buttonLoader: boolean;
    showNewEnrolmentButton: boolean;

    pageSize: number;
    pageNumber: number;

    @Input() selected: Child;

    @Output()
    updateScroll: EventEmitter<any>;

    dialogRef: any;
    entitlementModal: NzModalRef;
    verifyEnrolmentModal: NzModalRef;
    enrolmentInfoModal: NzModalRef;
    confirmModal: NzModalRef;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildrenService} _childrenService
     * @param {ChildEnrolmentService} _childEnrolmentService
     * @param {NzModalService} _modalService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _childrenService: ChildrenService,
        private _childEnrolmentService: ChildEnrolmentService,
        private _modalService: NzModalService,
        private _commonService: CommonService,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
    )
    {
        // set default values
        this.filteredSource = [];
        this.buttonLoader = false;
        this.showNewEnrolmentButton = true;
        this.pageSize = 2;
        this.pageNumber = 1;
        this.updateScroll = new EventEmitter();

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
        this._logger.debug('child details - enrollments view !!!');

        // Initial reference
        this.child = this.selected;

        // Initial validation
        this.canCreateEnrolment();

        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild =>
            {
                this.child = (!currentChild) ? null : currentChild;

                this.canCreateEnrolment();
            });
        
        // Subscribe to route on changes
        this._router
            .events
            .pipe(
                filter((event) => event instanceof NavigationEnd || event instanceof NavigationError || event instanceof NavigationCancel),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => this.child.enrollments.forEach(i => i.isLoading = false));
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.entitlementModal)
        {
            this.entitlementModal.close();    
        }

        if (this.verifyEnrolmentModal)
        {
            this.verifyEnrolmentModal.close();    
        }

        if (this.enrolmentInfoModal)
        {
            this.enrolmentInfoModal.close();    
        }

        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

        this.filteredSource = [];

        this.updateScroll.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * got enrolment edit or new page
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     */
    goToEnrolment(e: MouseEvent, item?: Enrolment): void
    {
        e.preventDefault();

        if (this.disableView())
        {
            return;
        }

        if (item)
        {
            item.isLoading = true;    
        }

        const url = `${this._router.url}/child/${this.child.id}/enrolment${item ? '/' + item.id : ''}`;
        
        this._router.navigateByUrl(_.trim(url));
    }

    /**
     * check if new enrolment is accessible
     */
    canCreateEnrolment(): void
    {
        this.showNewEnrolmentButton = (this.child)
            ? (this.child.enrollments.length === 0) ? true
            : _.head(this.child.enrollments).enrolmentClosed() : false;
    }

    /**
     * get enrolment list
     *
     * @returns {Enrolment[]}
     */
    getFilteredSource(): Enrolment[]
    {
        return this.paginate(this.child.enrollments, this.pageSize, this.pageNumber);
    }

    /**
     * on page change
     *
     * @param {number} page
     */
    onPaginateChange(page: number): void
    {
        this.pageNumber = page;

        this.filteredSource = this.paginate(this.child.enrollments, this.pageSize, this.pageNumber);
    }

    /**
     * get paginate list
     *
     * @param {*} array
     * @param {number} pageSize
     * @param {number} pageNumber
     * @returns {*}
     */
    paginate(array: any, pageSize: number, pageNumber: number): any
    {
        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    }

    /**
     * disable ui elements onload
     *
     * @returns {boolean}
     */
    disableView(): boolean
    {
        return !this.child.enrollments.every(i => i.isLoading === false);
    }

    /**
     * check for enrolment status
     *
     * @param {Enrolment} item
     */
    checkEnrolmentStatus(e: MouseEvent, item: Enrolment): void
    {
        e.preventDefault();
        
        item.isLoading = true;

        this._commonService.onApiProgressBarChanged.next(item.isLoading);

        this._childEnrolmentService
            .checkEnrolmentStatus(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    item.isLoading = false;

                    this._commonService.onApiProgressBarChanged.next(item.isLoading);
                })
            )
            .subscribe(
                response =>
                {
                    this.child.enrollments[this.child.enrollments.findIndex(i => i.id === item.id)] = response;

                    this.child.enrollments.map((i, idx) =>
                    {
                        i.index = idx;
                        return i;
                    });
                },
                error =>
                {
                    throw error;
                }
            );
    }
    
    /**
     * view entitlements
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     * @returns {void}
     */
    viewEntitlement(e: MouseEvent, item?: Enrolment): void
    {
        e.preventDefault();

        item.isLoading = true; 

        this._commonService.onApiProgressBarChanged.next(item.isLoading);
        
        this._childEnrolmentService
            .getEntitlement(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    item.isLoading = false;

                    this._commonService.onApiProgressBarChanged.next(item.isLoading);
                })
            )
            .subscribe(
                response =>
                {
                    this.entitlementModal = this._modalService
                        .create({
                            nzTitle: `Entitlement - ${this.child.getShortName()}`,
                            nzContent: ShowEntitlementComponent,
                            nzMaskClosable: true,
                            nzComponentParams: {
                                entitlement: response
                            },
                            nzWrapClassName: 'custom-search-list',
                            nzFooter: [
                                {
                                    label: 'CLOSE',
                                    type: 'default',
                                    onClick: () => this.entitlementModal.destroy()
                                }
                            ]
                        });
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

    /**
     * verify existing enrolment
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     * @returns {void}
     */
    addExistingEnrolment(e: MouseEvent, item?: Enrolment): void
    {
        e.preventDefault();

        if (this.disableView())
        {
            return;
        }

        this.verifyEnrolmentModal = this._modalService
            .create({
                nzTitle: 'Add Existing Enrolment',
                nzContent: AddExistingEnrolmentComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'child-add-existing-enrolment',
                nzComponentParams: {
                    child: this.child
                },
                nzFooter: [
                    {
                        label: 'VERIFY',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.enrolmentForm.valid),
                        onClick: componentInstance => 
                        {
                            return componentInstance!
                                .verifyEnrolment()
                                .then(response => 
                                    {
                                        this.child.enrollments = [...response.items];

                                        setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);

                                        this.verifyEnrolmentModal.destroy();
                                    });
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.verifyEnrolmentModal.destroy()
                    }
                ]
            });
    }

    /**
     * delete enrolment
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     */
    delete(e: MouseEvent, item?: Enrolment): void
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

                            this._childEnrolmentService
                                .delete(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => 
                                    {
                                        item.isLoading = false;

                                        resolve();
                                    })
                                )
                                .subscribe(
                                    response =>
                                    {
                                        this.child.enrollments = response.list;

                                        this.canCreateEnrolment();

                                        setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    /**
     * view CWA
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     */
    goToCWA(e: MouseEvent, item?: Enrolment): void
    {
        e.preventDefault();

        if (item) 
        {
            item.isLoading = true;
        }

        setTimeout(
            () => (
                (item.isLoading = false),
                (this.dialogRef = this._matDialog.open(ApproveCwaAdminDialogComponent, {
                    panelClass: 'cwa-admin-approve',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        enrolment: item,
                        child: this.child
                    }
                })),
                this.dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(message => {
                        if (!message) {
                            return;
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    })
            ),
            300
        );
        
    }

    /**
     * resent parent confirmation mail
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     */
    sendEmail(e: MouseEvent, item?: Enrolment): void
    {
        e.preventDefault();

        if (item) 
        {
            item.isLoading = true;
        }

        const dataObj = {
            id: item.id,
            child: this.child.id
        };

        this._childrenService
        .sendEmailToParent(dataObj)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
            message =>
            {
                item.isLoading = false;
                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

            },
            error =>
            {
                item.isLoading = false;

                throw error;
            },
            () =>
            {
                this._logger.debug('😀 all good. 🍺');
            }
        );


    }

    /**
     * read enrolment details
     *
     * @param {MouseEvent} e
     * @param {Enrolment} [item]
     */
    viewEnrolmentDetails(e: MouseEvent, item?: Enrolment): void
    {
        e.preventDefault();

        item.isLoading = true; 

        this._commonService.onApiProgressBarChanged.next(item.isLoading);

        this._childEnrolmentService
            .getEnrolmentFromApi(item.enrolId)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    item.isLoading = false;

                    this._commonService.onApiProgressBarChanged.next(item.isLoading);
                })
            )
            .subscribe(
                response =>
                {
                    this.enrolmentInfoModal = this._modalService
                        .create({
                            nzTitle: `Enrolment - ${this.child.getShortName()} (${item.enrolId})`,
                            nzContent: 'hello',
                            nzMaskClosable: true,
                            nzComponentParams: {
                                enrolment: response
                            },
                            nzWrapClassName: 'custom-search-list',
                            nzFooter: [
                                {
                                    label: 'CLOSE',
                                    type: 'default',
                                    onClick: () => this.enrolmentInfoModal.destroy()
                                }
                            ]
                        });
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

