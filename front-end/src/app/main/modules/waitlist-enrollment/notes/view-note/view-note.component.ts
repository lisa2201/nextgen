import {Component, Inject, OnInit, ViewEncapsulation, Output, OnDestroy} from '@angular/core';
import {fadeMotion, helpMotion, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WaitlistEnrolmentNotesService} from '../../service/waitlist-enrolment-notes.service';
import {Subject} from 'rxjs';


@Component({
    selector: 'view-note',
    templateUrl: './view-note.component.html',
    styleUrls: ['./view-note.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})

export class ViewNoteComponent implements OnInit,OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    noteList: any
    dialogTitle: string = 'Notes'
    addNew: string = 'view'

    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: any,
        public matDialogRef: MatDialogRef<ViewNoteComponent>,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService
    ) {
        this.noteList = [];
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this.noteList = this._data.response.notes;
        this._waitlistEnrolmentNotesService.getAddNewNoteStatus().subscribe(value => {
            this.addNew = value;
        })
        this._waitlistEnrolmentNotesService.refreshNeed.subscribe(() => {
                this._waitlistEnrolmentNotesService.getNotesForEnrolmentOrWaitlist(this._data.response.item).subscribe(value1 => {
                    this.noteList = value1.data;
                })
            }
        )
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    addNote(e): void {
        e.preventDefault();
        this._waitlistEnrolmentNotesService.setEditNote([]);
        this.addNew = 'add';
    }


}
