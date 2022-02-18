import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { NzModalService, NzModalRef } from 'ng-zorro-antd/modal';

import { ImportBookingService } from './services/import-bookings.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Organization } from '../../organization/Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { ImportBookingsListViewComponent } from './list-view/list-view.component';
import { GetImportBookingsComponent } from './modals/get-import-bookings/get-import-bookings.component';

@Component({
    selector: 'import-bookings',
    templateUrl: './bookings.component.html',
    styleUrls: ['./bookings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportBookingsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    organizations: Organization[];
    buttonLoader: boolean;
    importModal: NzModalRef;

    @ViewChild(ImportBookingsListViewComponent)
    listViewComponent: ImportBookingsListViewComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _bookingImportService: ImportBookingService,
        private _notificationService: NotificationService
    )
    {
        // set default values
        this.organizations = [];
        this.buttonLoader = false;

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
        this._logger.debug('import bookings !!!');

        // Subscribe to resource changes
        this._bookingImportService
            .onDependsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => this.organizations = data.subscribers);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.importModal)
        {
            this.importModal.close();    
        }

        this._bookingImportService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * get bookings from list view
     *
     * @returns {Array<any>}
     */
    getBookings(): Array<any>
    {
        return this.listViewComponent ? this.listViewComponent.bookingList : []; 
    }

    /**
     * check for bookings
     *
     * @returns {boolean}
     */
    hasBookings(): boolean
    {
        return this.getBookings().length > 0; 
    }

    /**
     * check if booking lits has error
     *
     * @returns {Array<any>}
     */
    getBookingErrors(): Array<any>
    {
        return this.listViewComponent ?  this.listViewComponent.bookingList.filter(i => i.hasError) : []; 
    }

    /**
     * check for booking errors
     *
     * @returns {boolean}
     */
    hasErrors(): boolean
    {
        return this.getBookingErrors().length > 0;
    }

    /**
     * import bookings
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.buttonLoader)
        {
            return;
        }

        this.importModal = this._modalService
            .create({
                nzTitle: 'Import Bookings',
                nzContent: GetImportBookingsComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'get-import-bookings-modal',
                nzComponentParams: {
                    organizations: this.organizations
                },
                nzFooter: [
                    {
                        label: 'IMPORT',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.form.valid),
                        onClick: (componentInstance) => componentInstance
                            .getBookings()
                            .then(res => 
                            {
                                this._bookingImportService.onBookingsChanged.next({
                                    list: res.bookings,
                                    children: res.children,
                                    fees: res.fees,
                                    rooms: res.rooms,
                                    branch: res.branch,
                                    organization: res.organization,
                                    csv: res.csvData,
                                    history: res.history
                                });

                                this.importModal.destroy();
                            })
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.importModal.destroy()
                    }
                ]
            });
    }

    /**
     * reload imports
     *
     * @param {MouseEvent} e
     */
    reload(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        this.listViewComponent
            .refetch()
            .catch(error => { throw error; })
            .finally(() => setTimeout(() => this.buttonLoader = false, 200))
    }

    /**
     * migrate bookings
     *
     * @param {MouseEvent} e
     */
    update(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.hasErrors())
        {
            return;
        }

        const sendObj = this.listViewComponent.getMigrationValues();

        this._logger.debug('[migrate booking objects]', sendObj);

        this.buttonLoader = true;

        this._bookingImportService
            .migrateBookings(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                message => 
                {
                    setTimeout(() => this._notificationService.displaySnackBar(message, NotifyType.SUCCESS), 200);
                },
                error => 
                {
                    throw error;
                }
            )
    }
}
