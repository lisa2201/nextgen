import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import * as moment from 'moment';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { KisokService } from '../../service/kisok.service';

@Component({
    selector: 'app-get-missed-attendance',
    templateUrl: './get-missed-attendance.component.html',
    styleUrls: ['./get-missed-attendance.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]

})
export class GetMissedAttendanceComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    child: any;
    booking: any;
    missed: any;
    signForm: FormGroup;
    buttonLoader: boolean;
    currentData: any;
    viewLoading: boolean;
    children: any;


    monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    constructor(
        public matDialogRef: MatDialogRef<GetMissedAttendanceComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _kisokService: KisokService,
    ) {
        this._unsubscribeAll = new Subject();
        this.viewLoading = false;

        console.log(_data);
        this.missed = _data.data;
        this.currentData = this.missed[0];
        this.children = _data.children;
        this.signForm = this.createForm();



    }

    ngOnInit() {


    }

    getRoom(): string {

        let child = this.children.find(v => v.index === this.currentData.child.index);

        if (child) {

            return child.rooms.find(v => v.id === this.currentData.booking.room_id)?.title;
        }
    }
    createForm(): FormGroup {
        return new FormGroup({
            pick_time: new FormControl(this.currentData.pick_time !== null ?this.stringToMinute(this.currentData.pick_time) : null, [Validators.required]),
            drop_time: new FormControl(this.currentData.drop_time !== null ? this.stringToMinute(this.currentData.drop_time) : null, [Validators.required])
        });
    }

    stringToMinute(value: string):number{

        // drop_time: "5:19 PM"
        if(value){

            value.trim();
            let a = value.substring(value.length-2, value.length);
            let arrayTime = value.split(':');
            let h = parseInt(arrayTime[0]) + (a === 'PM'? +12 : +0);
            let m = parseInt(arrayTime[1].substring(0,2));

            console.log(h,m,a, arrayTime);
            
            return (h*60)+(m);

           
        }

        else{
            return null;
        }

    }

    getDate(item): string {

        let attendanceDate = DateTimeHelper.parseMomentDate(item.date);

        let day = _.capitalize(DateTimeHelper.getDayName(DateTimeHelper.now()));

        let date = moment(attendanceDate).format('D');

        let month = _.capitalize(this.monthNames[attendanceDate.getMonth()]);

        let year = moment(attendanceDate).format('YYYY');

        return `${date} ${month} ${year} `;


    }

    get fc(): any {
        return this.signForm.controls;
    }


    timeTo24(time: string) {

        // time: "1:30 PM"
        if (time) {

            time.trim();

            if (time.search('AM') !== -1) {


                return time.replace('AM', '').trim();
            }
            else {

                let arrayTime = time.split(':');

                let h = parseInt(arrayTime[0])
                let m = parseInt(arrayTime[1].replace('PM', ''));

                let hf = h + 12;

                return `${hf}:${m}`;
            }

        }
        else {

            let today = new Date();
            let time = today.getHours() + ":" + today.getMinutes();

            return time;
        }


    }

    timeTransform(value: number, type: string): string {
        if (isNaN(parseFloat(String(value))) || !isFinite(value)) {
            return null;
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';

        return `${h}:${m} ${a}`;
    }

    onFormSubmit(e: MouseEvent) {

        e.preventDefault();

        if (this.signForm.invalid) {
            return;
        }

        this.viewLoading = true;

        const sendObj = {

            child_id: JSON.stringify([this.currentData.child_id]),
            attendance_id: this.currentData.index,
            parent_drop_time: this.timeTo24(this.timeTransform(this.fc.drop_time.value, '24h')),
            parent_pick_time: this.timeTo24(this.timeTransform(this.fc.pick_time.value, '24h')),

        };

        this._logger.debug('[attendance object]', sendObj);

        this.buttonLoader = true;

        this._kisokService
            .completeMissedAttendance(sendObj, false)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                res => {


                    // this.resetForm(null);
                    setTimeout(() => this.matDialogRef.close(res), 250);


                },
                error => {
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }
}
