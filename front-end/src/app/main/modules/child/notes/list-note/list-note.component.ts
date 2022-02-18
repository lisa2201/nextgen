import {Component, Inject, Input, OnInit} from '@angular/core';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {WaitlistEnrolmentNotesService} from '../../../waitlist-enrollment/service/waitlist-enrolment-notes.service';
import {AppConst} from 'app/shared/AppConst';
import {Subject} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {AddEditNoteComponent} from '../add-edit-note/add-edit-note.component';
import {ChildService} from '../../services/child.service';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import {CommonService} from 'app/shared/service/common.service';

@Component({
    selector: 'list-child-note',
    templateUrl: './list-note.component.html',
    styleUrls: ['./list-note.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ListNoteComponent implements OnInit {

    @Input() noteList: any[];
    inputsLoading: boolean = false;
    private _unsubscribeAll: Subject<any>;
    dialogRef: any;
    confirmModal: NzModalRef;

    constructor(
        private _commonService: CommonService,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _childService: ChildService,
        private _modalService: NzModalService,
    ) {
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
    }

    edit(item): void {
        this._waitlistEnrolmentNotesService.setEditNote(item)
        this._waitlistEnrolmentNotesService.setAddNewNoteStatus('edit')
        this.addEditNote()
    }

    delete(item): void {


        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete this?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        const params = {
                            note_index: item.id
                        }
                        this.inputsLoading = true;
                        this._waitlistEnrolmentNotesService.deleteNote(params).subscribe(res => {
                                this.inputsLoading = false;
                                if (res.code === 201) {
                                    setTimeout(() => this._notification.displaySnackBar('Successfully Deleted', NotifyType.SUCCESS), 200);
                                } else {
                                    setTimeout(() => this._notification.displaySnackBar('Add failed.', NotifyType.ERROR), 500);
                                }
                                this._childService.getChild(this.noteList['id']);
                            },
                            error => {
                                throw error;
                            })
                    }
                }
            );
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
                            child_id: this.noteList['id'],
                        }
                    }
                });
    }

    getUserProfileImage(note): string {
        if (note.created_by_avatar)
            return this._commonService.getS3FullLink(note.created_by_avatar);
        else
            return `assets/icons/flat/ui_set/custom_icons/employees.svg`;
    }
}
