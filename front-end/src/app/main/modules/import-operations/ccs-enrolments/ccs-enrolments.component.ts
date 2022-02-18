import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { ImportCCSEnrolmentService } from './services/import-enrolments.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Organization } from '../../organization/Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { GetImportEnrollmentsComponent } from './modals/get-import-enrollments/get-import-enrollments.component';
import { ImportCCSEnrollmentsListViewComponent } from './list-view/list-view.component';

@Component({
    selector: 'import-ccs-enrolments',
    templateUrl: './ccs-enrolments.component.html',
    styleUrls: ['./ccs-enrolments.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportCCSEnrollmentsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    organizations: Organization[];
    buttonLoader: boolean;
    importModal: NzModalRef;
    viewMissingEnrollmentsModal: NzModalRef;

    @ViewChild(ImportCCSEnrollmentsListViewComponent)
    listViewComponent: ImportCCSEnrollmentsListViewComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _enrolmentImportService: ImportCCSEnrolmentService,
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
        this._logger.debug('import ccs enrollments !!!');

        // Subscribe to resource changes
        this._enrolmentImportService
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

        if (this.viewMissingEnrollmentsModal)
        {
            this.viewMissingEnrollmentsModal.close();
        }

        this._enrolmentImportService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * get enrollments from list view
     *
     * @returns {Array<any>}
     */
    getEnrollments(): Array<any>
    {
        return this.listViewComponent ? this.listViewComponent.enrollments : []; 
    }

    /**
     * check for enrollments
     *
     * @returns {boolean}
     */
    hasEnrollments(): boolean
    {
        return this.getEnrollments().length > 0; 
    }

    /**
     * check if enrolment lits has error
     *
     * @returns {Array<any>}
     */
    getEnrolmentErrors(): Array<any>
    {
        return this.listViewComponent ? this.listViewComponent.enrolmentList.filter(i => i.hasError) : []; 
    }

    /**
     * check for enrolment errors
     *
     * @returns {boolean}
     */
    hasErrors(): boolean
    {
        return this.getEnrolmentErrors().length > 0;
    }

    /**
     * get missing enrollments from csv import
     *
     * @returns {Array<string>}
     */
    getMissingEnrollments(): Array<string>
    {
        return this.listViewComponent ? this.listViewComponent.missingEnrollments : []; 
    }

    /**
     * import enrollments
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
                nzTitle: 'Import Enrollments',
                nzContent: GetImportEnrollmentsComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'get-import-enrollments-modal',
                nzComponentParams: {
                    organizations: this.organizations
                },
                nzFooter: [
                    {
                        label: 'IMPORT',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.form.valid),
                        onClick: (componentInstance) => componentInstance
                            .getEnrollments()
                            .then(res => 
                            {
                                this._enrolmentImportService.onEnrollmentsChanged.next({
                                    list: res.enrollments,
                                    children: res.children,
                                    fees: res.fees,
                                    parents: res.parents,
                                    missing: res.missing,
                                    branch: res.branch,
                                    organization: res.organization,
                                    csv: res.csvData,
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
     * view missing enrollments
     *
     * @param {MouseEvent} e
     */
    viewMissingEnrollments(e: MouseEvent): void
    {
        e.preventDefault();

        this.viewMissingEnrollmentsModal = this._modalService.create({
            nzTitle: 'Missing Enrollments',
            nzContent: '<div class="text-justify">' + this.getMissingEnrollments().join(', ') + '</div>',
            nzFooter: [
                {
                    label: 'CLOSE',
                    type: 'danger',
                    onClick: () => this.viewMissingEnrollmentsModal.destroy()
                  },
            ]
        })
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
     * migrate enrollments
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

        this._logger.debug('[migrate enrolment objects]', sendObj);

        this.buttonLoader = true;

        this._enrolmentImportService
            .migrateEnrollments(sendObj)
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
