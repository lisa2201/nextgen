import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {WaitlistEnrolmentNotesService} from '../../../service/waitlist-enrolment-notes.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';


@Component({
    selector: 'add-note',
    templateUrl: './add-note.component.html',
    styleUrls: ['./add-note.component.scss']
})
export class AddNoteComponent implements OnInit {

    noteForm: FormGroup
    note: string = '';
    addNew: string = 'view'
    buttonLoader: boolean = false
    title: string = '';
    editData: any = []

    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService,
        private _notification: NotificationService,
    ) {
    }

    ngOnInit(): void {
        this.editData = this._waitlistEnrolmentNotesService.getEditNote()
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

    viewList(): void {
        this._waitlistEnrolmentNotesService.setAddNewNoteStatus(this.addNew)
    }

    saveNote(e): void {
        e.preventDefault();
        this.buttonLoader = true;
        this._waitlistEnrolmentNotesService.saveNote({
            edit: this.editData?.note !== undefined,
            note_index: this.editData?.note !== undefined ? this.editData?.id : '',
            note: this.fc.note.value,
            wait_enrol_id: this._data.response.item.id,
            status: this._data.response.status
        }).subscribe(res => {
            this.buttonLoader = false;
            if (res.code === 200) {
                setTimeout(() => this._notification.displaySnackBar((this.editData?.note !== undefined) ? 'Successfully updated.' : 'Successfully added.', NotifyType.SUCCESS), 500);
            } else {
                setTimeout(() => this._notification.displaySnackBar('Add failed.', NotifyType.ERROR), 500);
            }
        })
    }

    get fc(): any {
        return this.noteForm.controls;
    }

}

