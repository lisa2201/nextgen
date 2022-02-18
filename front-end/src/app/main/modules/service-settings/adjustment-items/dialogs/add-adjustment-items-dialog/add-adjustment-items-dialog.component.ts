import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AdjustmentItemsService } from '../../services/adjustment-items.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { AdjustmentItem } from '../../adjustment-item.model';

@Component({
    selector: 'app-add-adjustment-items-dialog',
    templateUrl: './add-adjustment-items-dialog.component.html',
    styleUrls: ['./add-adjustment-items-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class AddAdjustmentItemsDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    adjustmentItemForm: FormGroup;
    buttonLoading: boolean;
    editMode: boolean;
    item: null | AdjustmentItem;

    title: string;
    submitButtonText: string;

    constructor(
        public matDialogRef: MatDialogRef<AddAdjustmentItemsDialogComponent>,
        private _formBuilder: FormBuilder,
        private _adjustmentItemsService: AdjustmentItemsService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;

        if (_data.item === null) {
            this.editMode = false;
            this.title = 'Add Item';
            this.submitButtonText = 'Save';
            this.item = null;
        } else {
            this.editMode = true;
            this.title = 'Update Item';
            this.submitButtonText = 'Update';
            this.item = _data.item;
        }

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.createForm();
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create form
     */
    createForm(): void {

        this.adjustmentItemForm = this._formBuilder.group({
            name: new FormControl(this.item ? this.item.name : '', [Validators.required]),
            description: new FormControl(this.item ? this.item.description : '', [Validators.required])
        });

    }

    get fc(): any {
        return this.adjustmentItemForm.controls;
    }

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.adjustmentItemForm.invalid) {
            return;
        }

        this.buttonLoading = true;

        const sendObj = {
            name: this.fc.name.value,
            description: this.fc.description.value,
        };

        if (this.editMode) {
            sendObj['id'] = this.item.id;

            this._adjustmentItemsService.updateItem(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                setTimeout(() => this.matDialogRef.close(response), 250);

            });

        } else {
            
            this._adjustmentItemsService.createItem(sendObj)
                .pipe(
                    takeUntil(this.unsubscribeAll),
                    finalize(() => {
                        this.buttonLoading = false;
                    })
                )
                .subscribe((response) => {
    
                    setTimeout(() => this.matDialogRef.close(response), 250);
    
                });

        }


    }

}
