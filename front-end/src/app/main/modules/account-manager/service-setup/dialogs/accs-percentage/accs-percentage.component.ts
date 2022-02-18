import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { ServiceSetupService } from '../../services/service-setup.service';
import { finalize } from 'rxjs/operators';
import { Info } from 'luxon';
import { format } from 'date-fns';
import {DateTimeHelper} from '../../../../../../utils/date-time.helper';

@Component({
    selector: 'app-accs-percentage',
    templateUrl: './accs-percentage.component.html',
    styleUrls: ['./accs-percentage.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AccsPercentageComponent implements OnInit {

    serviceid: string;
    apiData: any;
    serviceForm: FormGroup;
    result: any;
    loading: boolean;
    
    constructor(
        private _formBuilder: FormBuilder,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<AccsPercentageComponent>,
        private _servicesetupService: ServiceSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) 
    {
        this.loading = false;
        this.serviceid = _data.serviceid;  
        this.result = null;
    }

    ngOnInit(): void {

        this.serviceForm = this.AccsPercentageForm();
        this.onFormSubmit(null);
    }

    AccsPercentageForm(): FormGroup {

        return this._formBuilder.group({
            date: new FormControl(new Date())
        });

    }

    onFormSubmit(ev: MouseEvent): void {
        // ev.preventDefault();

        const sentdata = {

            queryDate: DateTimeHelper.getUtcDate(this.serviceForm.get('date').value),
            serviceID : this.serviceid

        };

        this.loading = true;
    
        this._servicesetupService
            .updateAccsPErcentage(sentdata)
            .pipe(
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe((response) => {
                this.result = response.data
            });
    
    
    }
}
