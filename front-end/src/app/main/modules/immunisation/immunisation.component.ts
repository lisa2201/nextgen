import { Component, EventEmitter, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs/internal/Subject';
import { finalize, takeUntil } from 'rxjs/operators';
import { NewImmunisationComponent } from './dialog/new-immunisation/new-immunisation.component';
import { ImmunisationListViewComponent } from './list-view/list-view.component';
import { Immunisation } from './model/immunisation.model';
import { ImmunisationService } from './service/immunisation.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { Branch } from '../branch/branch.model';
import { ImportNewImmunisationComponent } from './dialog/import-new-immunisation/import-new-immunisation.component';
import { Organization } from '../organization/Models/organization.model';

@Component({
  selector: 'app-immunisation',
  templateUrl: './immunisation.component.html',
  styleUrls: ['./immunisation.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationComponent implements OnInit {

    immunisation: Immunisation[];
    buttonLoader: boolean;
    dialogRef: any;
    updateButtonsTriggered: boolean;
    confirmModal: NzModalRef;
    filterValue: any = null;
    isRoot: boolean;


    private _unsubscribeAll: Subject<any>;

    @ViewChild(ImmunisationListViewComponent)
    tableContentView: ImmunisationListViewComponent;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    
    constructor
        (
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _immunisationService: ImmunisationService,
        private _mediaObserver: MediaObserver,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _commonService: CommonService,
        private _authService: AuthService,

        ) 
        {
            this._unsubscribeAll = new Subject();
            this.isRoot =  this._authService.getUserLevel() === AppConst.roleLevel.ROOT;
            this.buttonLoader = false;
        }

    ngOnInit() {


    }


    get listViewLoading(): boolean
    {
        return (typeof this.tableContentView !== 'undefined') ? this.tableContentView.tableLoading : false;
    }

    addDialog(e: MouseEvent): void {
        e.preventDefault();
        this.buttonLoader = true;

        Promise.all([
            this._immunisationService.getBranches()
        ])
            .then(([branches]: [Branch]) => {
                setTimeout(() => this.buttonLoader = false, 200);


                (this.dialogRef = this._matDialog.open(NewImmunisationComponent, {
                    panelClass: 'new-immunisation',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        branch: branches
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
            });

    }

    ImportDialog(e: MouseEvent): void {
        e.preventDefault();
        this.buttonLoader = true;

        Promise.all([
            this._immunisationService.getDependency().toPromise()
        ])
            .then((organization: Organization[]) => {
                setTimeout(() => this.buttonLoader = false, 200);


                (this.dialogRef = this._matDialog.open(ImportNewImmunisationComponent, {
                    panelClass: 'import-immunisation',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        organization: organization
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
            });

    }

        /**
     * Update content scroll
     */
    updateScroll(): void
    {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

}
