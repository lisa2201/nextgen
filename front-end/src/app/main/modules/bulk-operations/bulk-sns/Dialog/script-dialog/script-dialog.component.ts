import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Child } from 'app/main/modules/child/child.model';
import { scheduleDataMap } from 'app/main/modules/child/immunisation-tracking/immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';
import { Immunisation } from 'app/main/modules/immunisation/model/immunisation.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import * as _ from 'lodash';
import { helpMotion, NzModalRef } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-script-dialog',
    templateUrl: './script-dialog.component.html',
    styleUrls: ['./script-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 }),
    ],
})
export class ScriptDialogComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    form: FormGroup;
    buttonLoader: boolean;
    branches: Branch[];

    @Input() organizations: Organization[];

    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    ) {


        this.buttonLoader = false;
        this._unsubscribeAll = new Subject();
        this.branches = [];
        this.form = this.createForm();
    }

    ngOnInit() {

         // Subscribe to form value changes
         this.form
         .get('org')
         .valueChanges
         .pipe(takeUntil(this._unsubscribeAll))
         .subscribe(val => 
             {
                 this.form.get('branch').patchValue(null);

                 this.branches = this.getBranches(val);
             }
         );
    }

    getBranches(value: string): any
    {
        return (value && !_.isEmpty(this.organizations.find(i => i.id === value))) ? this.organizations.find(i => i.id === value).branch : [];
    }

    createForm(): FormGroup {

        return new FormGroup({
            org: new FormControl(null, [Validators.required]),
            branch: new FormControl(null, []),
        });
    }
    trackByFn(index: number, item: any): number
    {
        return index;
    }

    get fc(): any {
        return this.form.controls;
    }


    getOrg() {

        return {
            org: this.fc.org.value,
            branch: this.fc.branch.value
        };
    }

    destroyModal(): void {
        this._modal.destroy();
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

}
