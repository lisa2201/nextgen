import {Component, Inject, OnInit, ViewEncapsulation, Output} from '@angular/core';
import {fadeMotion, helpMotion, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WaitlistEnrolmentNotesService} from '../../../waitlist-enrollment/service/waitlist-enrolment-notes.service';

@Component({
    selector: 'add-edit-note',
    templateUrl: './add-edit-note.component.html',
    styleUrls: ['./add-edit-note.component.scss'],
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

export class AddEditNoteComponent implements OnInit {

    noteList: any
    dialogTitle: string = 'Add Note'
    addNew: string = 'new'

    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: any,
        public matDialogRef: MatDialogRef<AddEditNoteComponent>,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService
    ) {
        this.noteList = [];
    }

    ngOnInit(): void {
        this.noteList = this._data.response.notes;
        this.addNew = (this._waitlistEnrolmentNotesService.getEditNote()?.note !== undefined) ? 'edit' : 'new';
    }


}
