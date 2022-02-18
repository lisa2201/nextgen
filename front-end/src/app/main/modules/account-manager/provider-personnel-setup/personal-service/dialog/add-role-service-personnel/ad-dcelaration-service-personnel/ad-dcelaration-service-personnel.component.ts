import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AddRoleServicePersonnelComponent } from '../add-role-service-personnel.component';
import { ServicePersonnel } from '../../../../model/ServicePersonnel';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NGXLogger } from 'ngx-logger';
import * as _ from 'lodash';
import { takeUntil } from 'rxjs/operators';
import { ServicePersonnelViewService } from '../../../../service/service-personnel-view-service';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-ad-dcelaration-service-personnel',
    templateUrl: './ad-dcelaration-service-personnel.component.html',
    styleUrls: ['./ad-dcelaration-service-personnel.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AdDcelarationServicePersonnelComponent implements OnInit {

    servicePersonnel: ServicePersonnel;
    declarationForm: FormGroup;
    buttonLoader: boolean;
    private _unsubscribeAll: Subject<any>;

    declaration = [
        {
            name: 'WWCC',
            help: 'A working with children card check issued by the authority responsible for working with children cards in the State or Territory in relation to care provided by a child care service of the provider.',
            index: 0,
            dbName: 'wwcc'
        },
        {
            name: 'Police Check',
            help: 'An Australian National Policy Criminal History Check obtained from the relevant state or territory police service or an agency accredited by the Australian Criminal Intelligence Commission, and obtained no more than six months previously.',
            index: 1,
            dbName: 'policeCheck'
        },
        {
            name: 'AFSA',
            help: 'A National Personal Insolvency Index check performed using the Bankruptcy Register Search service provided by the Australian Financial Security Authority (AFSA).',
            index: 2,
            dbName: 'AFSA'
        },
        {
            name: 'ASIC',
            help: 'A Current and Historical personal name extract search of the records of the Australian Securities and Investments Commission (ASIC).',
            index: 3,
            dbName: 'ASIC'
        },
        {
            name: 'Adverse Events',
            help: 'Have the above checks revealed any adverse events?',
            index: 4,
            dbName: 'adverseEvents'
        }
    ];


    constructor(
        private _logger: NGXLogger,
        private _servicePersonnelViewService: ServicePersonnelViewService,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<AdDcelarationServicePersonnelComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();
        this.servicePersonnel = _data.servicePersonnel;
        console.log(this.servicePersonnel);
        console.log(_data);
    }

    ngOnInit(): void {

        this.declarationForm = this.createDeclarationForm();
        this.addDeclarationsCheckbox();
    }


    createDeclarationForm(): FormGroup {
        return new FormGroup({
            declaration: new FormArray([]),
        });

    }

    addDeclarationsCheckbox(): void {
        this.servicePersonnel.personnelDeclaration.forEach((v: any, i: number) => {
            const control = new FormControl(v.value, []);
            (this.fc.declaration as FormArray).push(control);
        });
    }

    get fc(): any {
        return this.declarationForm.controls;
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    onFormSubmit(e: MouseEvent): void {
        this._logger.debug('[provider personal submit]');
        e.preventDefault();

        console.log(this.declarationForm);

        // tslint:disable-next-line: variable-name
        const declaration_object = [];

        _.forEach(this.fc.declaration.value, (v, i) => {
            declaration_object.push({
                index: i, 
                item: this.declaration[i]['dbName'],
                value: this.fc.declaration.value[i]
            });
        });

        const sendObj = {
            id: this.servicePersonnel.id,
            declaration: declaration_object,
        };
       
        this._logger.debug('[personal object]', sendObj);

        this.buttonLoader = true;

        this._servicePersonnelViewService
            .updateDeclaration(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;

                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );


    }

}

