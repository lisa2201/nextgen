import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {WaitlistEnrolmentNotesService} from '../../../../waitlist-enrollment/service/waitlist-enrolment-notes.service';
import {ChildService} from '../../../services/child.service';


@Component({
    selector: 'add-note',
    templateUrl: './note-form.component.html',
    styleUrls: ['./note-form.component.scss']
})
export class NoteFormComponent implements OnInit {

    noteForm: FormGroup
    note: string = '';
    addNew: string = 'new'
    buttonLoader: boolean = false
    title: string = '';
    editData: any = []

    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: any,
        public matDialogRef: MatDialogRef<NoteFormComponent>,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService,
        private _notification: NotificationService,
        private _childService: ChildService,
    ) {
    }

    ngOnInit(): void {
        this.editData = this._waitlistEnrolmentNotesService.getEditNote()
        this.addNew = (this.editData?.note !== undefined) ? 'edit' : 'new';
        this.noteForm = this.createInputForm();
    }

    createInputForm(): FormGroup {
        return new FormGroup({
            note: new FormControl((this.editData?.note !== undefined) ? this.editData.note : '', [Validators.required]),
        });
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }
        setTimeout(() => this.noteForm.reset(), 20);
    }

    saveNote(e): void {
        e.preventDefault();
        this.buttonLoader = true;
        console.log({
            edit: this.editData?.note !== undefined,
            note_index: this.editData?.note !== undefined ? this.editData?.id : '',
            note: this.fc.note.value,
            wait_enrol_id: this.editData?.waitlist_enrol_id !== undefined ? this.editData?.waitlist_enrol_id : '',
            child_id: this._data.response.child_id,
            status: 2
        })

        this._waitlistEnrolmentNotesService.saveNote({
            edit: this.editData?.note !== undefined,
            note_index: this.editData?.note !== undefined ? this.editData?.id : '',
            note: this.fc.note.value,
            wait_enrol_id: this.editData?.waitlist_enrol_id !== undefined ? this.editData?.waitlist_enrol_id : '',
            child_id: this._data.response.child_id,
            status: 2
        }).subscribe(res => {
            this.buttonLoader = false;
            this.matClose()
            if (res.code === 200) {
                setTimeout(() => this._notification.displaySnackBar((this.editData?.note !== undefined) ? 'Successfully updated.' : 'Successfully added.', NotifyType.SUCCESS), 200);
            } else {
                setTimeout(() => this._notification.displaySnackBar('Add failed.', NotifyType.ERROR), 500);
            }
            this._childService.getChild(this._data.response.child_id);
        })
    }

    matClose(): void {
        this.matDialogRef.close();
    }

    get fc(): any {
        return this.noteForm.controls;
    }

}

