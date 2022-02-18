import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {FormGroup} from '@angular/forms';
import {NotificationService} from 'app/shared/service/notification.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {finalize, takeUntil} from 'rxjs/operators';
import {NzModalRef, NzModalService} from 'ng-zorro-antd';
import {Subject} from 'rxjs';
import {EnrollmentsService} from '../../../services/enrollments.service';


@Component({
    selector: 'waitlist-template-left-sidenav',
    templateUrl: './waitlist-template-left-sidenav.component.html',
    styleUrls: ['./waitlist-template-left-sidenav.component.scss']
})
export class WaitlistTemplateLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    @Input() sections: any[]
    @Input() settingsMaster: string;
    @Input() formGroup: FormGroup;
    @Output() sectionEvent = new EventEmitter<any>()
    showFilterButton: boolean;
    selectedSection;
    filtersForm: FormGroup;
    editId: string = '';
    editValues: object;
    deletable: object;
    confirmModal: NzModalRef;

    constructor(
        private _notification: NotificationService,
        private _enrollmentsService: EnrollmentsService,
        private _modalService: NzModalService,
    ) {
        this.showFilterButton = false;
        this.deletable = [];
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this.selectedSection = 'child_information'
        this.drawSection(this.sections[0])
        this.isDeletable();
        // this._enrollmentsService.refreshNeed.subscribe(() => {
        //     console.log('oooooo')
        //
        // })
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        if (this.confirmModal) {
            this.confirmModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    drop(event: CdkDragDrop<string[]>): void {
        moveItemInArray(this.sections, event.previousIndex, event.currentIndex);
        this.sections.forEach((value, index) => {
            this.formGroup.get(value['section_code'] + '.section_settings.section_order').patchValue(index + 1, {emitEvent: false});
        })
        this._enrollmentsService.setSaveButtonActivate(true);
    }

    drawSection(e): void {
        this.sectionEvent.emit(e)
        this.selectedSection = e.section_code
        // console.log(e);
    }

    sectionsAdded(data: { name: string, updatation: boolean, sec_id: string }): void {
        let secLength: number = this.sections.length;
        const t = this.sections.findIndex(x => x.title === data.name)
        if (t !== -1) {
            this._notification.clearSnackBar();
            setTimeout(() => this._notification.displaySnackBar('Section already exists', NotifyType.ERROR), 200);
            return
        }
        if (!data.updatation) {
            const newSection = {
                id: 'newSection',
                title: data.name,
                section_code: (data.name.replace(/[^a-zA-Z0-9]/g, '')).toLowerCase(),
                mandatory: true,
                section_position_static: true,
                section_order: secLength++,
                section_hide: false,
                inputs: [],
            }
            this.sections.push(newSection);
            this.drawSection(newSection);
            this.deletable['newSection'] = true;
        } else {
            const p = this.sections.findIndex(x => x.id === data.sec_id)
            this.sections[p].title = data.name;
            this.sections[p][this.sections[p].id] = true;
        }

    }

    editName(section): void {
        this.editId = section.id;
        this.editValues = {name: section.title, sec_id: section.id}
    }

    isDeletable(): void {
        this.sections.forEach(x => {
            this.deletable[x.id] = x.inputs.findIndex(y => y.input_mandatory_changeable === true) === 0
        })
        // console.log('deletable')
        // console.log(this.sections[secIs].inputs.findIndex(y => y.input_mandatory_changeable === true))
        // return this.sections[secIs].inputs.findIndex(y => y.input_mandatory_changeable === true) === 0

    }

    deleteSection(e, section): void {
        if (section.id !== 'newSection') {
            e.preventDefault();
            this.confirmModal = this._modalService
                .confirm(
                    {
                        nzTitle: 'Are you sure want to delete this section?',
                        nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                        nzWrapClassName: 'vertical-center-modal',
                        nzOkText: 'Yes',
                        nzOkType: 'danger',
                        nzOnOk: () => {
                            return new Promise((resolve, reject) => {
                                const sendObj = {
                                    section_id: section.id,
                                    form: this.settingsMaster,
                                };
                                this._enrollmentsService.sectionRemove({section_id: section.id})
                                    .pipe(
                                        takeUntil(this._unsubscribeAll),
                                        finalize(() => {
                                            // this.tableLoading = false;
                                            resolve();
                                        })
                                    )
                                    .subscribe(
                                        message => {
                                            setTimeout(() => {
                                                this.drawSection(this.sections[0])
                                                this._notification.displaySnackBar(message.message, NotifyType.SUCCESS);
                                                // this.onTableChange();
                                            }, 200);
                                        },
                                        error => {
                                            throw error;
                                        }
                                    );
                            });
                        }
                    }
                );
        } else {
            this.sections = this.sections.filter(obj => obj !== section);
        }
    }
}
