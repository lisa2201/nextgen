import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import * as _ from 'lodash';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog } from '@angular/material/dialog';
import { AppConst } from '../../../../shared/AppConst';
import { NewOrEditDeterminationComponent } from './dialogs/new-or-edit-determination/new-or-edit-determination.component';
import { Child } from '../child.model';
import { takeUntil } from 'rxjs/operators';
import { browserRefresh } from '../../../../app.component';
import { Observable, of, Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { ChildrenService } from '../services/children.service';
import { AccsService } from './accs.service';
import { NewOrEditCertificateComponent } from './dialogs/new-or-edit-certificate/new-or-edit-certificate.component';
import { CertificateOrDetermination } from './certificate-or-determination.model';
import { CommonService } from '../../../../shared/service/common.service';
import { ChildService } from '../services/child.service';

@Component({
    selector: 'app-accs',
    templateUrl: './accs.component.html',
    styleUrls: ['./accs.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AccsComponent implements OnInit, OnDestroy {

    child: Child;
    determination: CertificateOrDetermination;
    dialogRef: any;
    buttonLoader: boolean;
    certificateORDetermination: CertificateOrDetermination[];
    ApiData: any[];
    private _unsubscribeAll: Subject<any>;

    constructor(
        private _router: Router,
        private _matDialog: MatDialog,
        private _accsService: AccsService,
        private _childService: ChildService,
        private _childrenService: ChildrenService,
        private _logger: NGXLogger,
        private _commonService: CommonService,
    ) {
        this.buttonLoader = false;
        this.child = null;
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

        this._childService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: Child) => {
                
                this._logger.debug('[child]', child);
                
                if (_.isEmpty(child)) {
                    this.child = null;
                } else {

                    this.child = child;
    
                    if (child) {
    
                        // when browser refreshed set selected child manually
                        if (browserRefresh) {
                            this._childrenService.currentChild = child;
                        }
                    }

                }

            });

        // subscribe to accs changes
        /*this._accsSerevice
            .onACCSChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((determination: any) => {
  
                this.determination = determination;
  
            });*/
        this._accsService
            .onACCSChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                // this._logger.debug('[certificates or determinations]', response);

                this.certificateORDetermination = response.items;
                this.ApiData = response.apiData;
                // this.total = response.totalDisplay;

            });
    }

    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

    }

    onBack(e: MouseEvent): void {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    createDetermination(e: MouseEvent): void {
        e.preventDefault();
        this.dialogRef = this._matDialog
            .open(NewOrEditDeterminationComponent,
                {
                    panelClass: 'app-new-or-edit-determination',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            child: this.child,
                            linkedCertificates: this.ApiData
                        }
                    }
                });
    }


    createCertificate(e: MouseEvent): void {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(NewOrEditCertificateComponent,
                {
                    panelClass: 'app-new-or-edit-certificate',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            child: this.child
                        }
                    }
                });
    }

    getChildProfileImage(item): string {
        if (item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
}
