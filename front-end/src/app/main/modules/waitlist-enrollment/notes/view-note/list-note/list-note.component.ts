import {Component, Inject, Input, OnInit} from '@angular/core';
import {WaitlistEnrolmentNotesService} from '../../../service/waitlist-enrolment-notes.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import {CommonService} from 'app/shared/service/common.service';

@Component({
    selector: 'list-note',
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
    confirmModal: NzModalRef;

    constructor(
        private _commonService: CommonService,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
    ) {

    }

    ngOnInit(): void {
    }

    edit(item): void {
        this._waitlistEnrolmentNotesService.setEditNote(item)
        this._waitlistEnrolmentNotesService.setAddNewNoteStatus('edit')
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
                        this._waitlistEnrolmentNotesService.deleteNote(params).subscribe(() => {
                            this.inputsLoading = false;
                            setTimeout(() => this._notification.displaySnackBar('Successfully Deleted', NotifyType.SUCCESS), 200);
                        })
                    }
                }
            );
    }

    getUserProfileImage(note): string {
        if (note.created_by_avatar)
            return this._commonService.getS3FullLink(note.created_by_avatar);
        else
            return `assets/icons/flat/ui_set/custom_icons/employees.svg`;
    }
}
