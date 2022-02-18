import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Subject} from 'rxjs';
import * as _ from 'lodash';
import {Router} from '@angular/router';
import {NGXLogger} from 'ngx-logger';
import {takeUntil} from 'rxjs/operators';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {Child} from '../child.model';
import {WaitlistEnrolmentNotesService} from '../../waitlist-enrollment/service/waitlist-enrolment-notes.service';
import {AddEditNoteComponent} from './add-edit-note/add-edit-note.component';
import {AppConst} from 'app/shared/AppConst';
import {CommonService} from 'app/shared/service/common.service';
import {ChildService} from '../services/child.service';

@Component({
    selector: 'child-notes',
    templateUrl: './child-notes.component.html',
    styleUrls: ['./child-notes.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ChildNotesComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    child: Child;
    notes: any;
    dialogRef: any;

    constructor(
        private _router: Router,
        private _childService: ChildService,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService,
    ) {
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this._childService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => {
                this._logger.debug('[child notes - child]', child);
                this.child = child;
                this.notes = child.notes;
            });
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    getChildProfileImage(item): string {
        if (item.image)
            return this._commonService.getS3FullLink(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }

    add(e): void {
        e.preventDefault();
        this._waitlistEnrolmentNotesService.setEditNote([]);
        this._waitlistEnrolmentNotesService.setAddNewNoteStatus('new')
        this.addEditNote()
    }

    addEditNote(): void {

        this.dialogRef = this._matDialog
            .open(AddEditNoteComponent,
                {
                    panelClass: 'notes-view-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            child_id: this.child.id,
                        }
                    }
                });
    }
}
