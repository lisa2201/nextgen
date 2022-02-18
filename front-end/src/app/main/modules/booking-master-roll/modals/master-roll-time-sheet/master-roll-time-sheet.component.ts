import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NzModalRef } from 'ng-zorro-antd/modal';

import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Room } from 'app/main/modules/room/models/room.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import {AuthService} from '../../../../../shared/service/auth.service';

@Component({
    selector: 'master-roll-time-sheet',
    templateUrl: './master-roll-time-sheet.component.html',
    styleUrls: ['./master-roll-time-sheet.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class MasterRollTimeSheetComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    timeSheetForm: FormGroup;

    @Input() rooms: Room[];
    centerWiseTickBox: boolean;
    securityClearanceTickBox: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef,
        private _bookingService: ChildBookingService,
        private _pdfService: PDFHelperService,
        private _notificationService: NotificationService,
        private _authService: AuthService,
    )
    {
        // set default values
        

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.centerWiseTickBox = false;
        this.securityClearanceTickBox = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('master roll time sheet !!!', this.rooms);

        this.timeSheetForm = this.createForm();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.timeSheetForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            date: new FormControl(DateTimeHelper.now().toDate(), [Validators.required]),
            rooms: new FormControl([], [Validators.required]),
        });
    }

    /**
     * check if item is already selected
     *
     * @param {Room} value
     * @returns {boolean}
     */
    isNotSelected(value: Room): boolean 
    {
        return this.fc.rooms.value.indexOf(value.id) === -1;
    }

    /**
     * select all rooms
     *
     * @param {MouseEvent} e
     */
    selectAllRooms(e: MouseEvent): void
    {
        // e.preventDefault();

        if(this.rooms.length === this.fc.rooms.length)
        {
            return;
        }

        this.timeSheetForm.get('rooms').patchValue(this.rooms.map(i => i.id));
    }

    /**
     * get room information
     *
     * @param {string} id
     * @returns {Room}
     */
    getRoomInfo(id: string): Room
    {
        return this.rooms.find(i => i.id === id);
    }

    centerWise(e): void
    {
        this.centerWiseTickBox = e;
        if(e)
        {
            this.selectAllRooms(null);
            this.fc.rooms.setValidators([]);
            this.fc.rooms.setErrors(null);
        }
        else
        {
            this.fc.rooms.setValidators([Validators.required]);
            if(this.fc.rooms.value.length === 0)
            {
                this.fc.rooms.setErrors({'required': true});
            }
        }
    }

    securityClearance(e): void
    {
        this.securityClearanceTickBox = e;
    }
    /**
     * get pdf content
     *
     * @param {Booking[]} bookings
     * @returns {Array<any>}
     */
    getPrintViewContent(bookings: Booking[]): Array<any>
    {
        const data: Array<any> = [];

        // remove duplicate children
        const newlist: Array<any> = bookings.reduce((results, booking) =>
        {
            // if room wise, remove duplicates where room name and child is same
            if(!this.centerWiseTickBox)
            {
                if(!results.some(obj => obj.child.id === booking.child.id && obj.room.id === booking.room.id))
                {
                    results.push(booking);
                }
            }
            // if center wise, remove duplicates where child is same
            else
            {
                if(!results.some(obj => obj.child.id === booking.child.id))
                {
                    results.push(booking);
                }
            }
            return results;
        }, []);

        const list: Array<any> = newlist.reduce((results, booking) =>
        {
            if(!this.centerWiseTickBox)
                (results[booking.room.id] = results[booking.room.id] || []).push(booking);
            else
                (results[booking.date] = results[booking.date] || []).push(booking);

            return results;
        }, []);

        // add rows
        for(const key in list)
        {
            if(!this.centerWiseTickBox)
                data.push({ text: `Room: ${this.getRoomInfo(key).title}`, style: 'room' });

            const headerWidth: Array<any> = _.fill(new Array(8), 'auto');
            
            data.push({
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: ['auto'].concat(headerWidth),
                    body: this.getTableContent(list[key])
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => (i === 0 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#4d4d4d',
                    vLineColor: (i, node)  => (i === 0 || i === node.table.body.length) ? null : '#4d4d4d'
                },
                style: 'table',

                pageBreak: (key === Object.keys(list).pop() || this.securityClearanceTickBox) ? 'avoid' : 'after'
            });
            // security clearance
            if(this.securityClearanceTickBox)
            {
                data.push(
                    {
                        text: '\n \n Security Clearance \n',
                        bold: true,fontSize: 13,color: 'black',
                    },
                    {
                        text: 'Center has been checked for children, no children present. All windows and doors locked. Security Check Completed. \n \n \n',
                    },
                    {
                        style: 'tableExample',
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', 'auto', '*'],
                            dontBreakRows: true,
                            keepWithHeaderRows: 1,
                            body: [
                                [
                                    {text: 'Staff 1 Name: ', bold: true,fontSize: 13,color: 'black', border: [false, false, false, false],},
                                    {text: '              ', border: [false, false, false, true],},
                                    {text: 'Signature: ', bold: true,fontSize: 13,color: 'black', border: [false, false, false, false],},
                                    {text: '              ',  border: [false, false, false, true],},
                                ],

                                [{text: 'Staff 2 Name: ', bold: true,fontSize: 13,color: 'black', border: [false, false, false, false],},
                                    {text: '              ', border: [false, false, false, true],},
                                    {text: 'Signature: ', bold: true,fontSize: 13,color: 'black', border: [false, false, false, false],},
                                    {text: '              ',  border: [false, false, false, true],},
                                ],


                            ]
                        },
                        pageBreak: key === Object.keys(list).pop() ? 'avoid' : 'after'
                    },

                );
            }

        }

        return data;
    }

    /**
     * get table content
     *
     * @param {Booking[]} bookings
     * @returns {*}
     */
    getTableContent(bookings: Booking[]): any
    {
        const table: Array<any> = [];

        // add headers
        table.push([
            { text: '', color: '#ffffff', fillColor: '#009fe9', alignment: 'left' , fontSize: 11},
            { text: 'Child', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},

            { text: 'In User', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},
            { text: 'In Time', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},
            { text: 'In Signature', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},

            { text: 'Out User', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},
            { text: 'Out Time', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},
            { text: 'Out Signature', color: '#ffffff', fillColor: '#009fe9', alignment: 'center' , fontSize: 11},
            { text: 'Notes', color: '#ffffff', fillColor: '#009fe9', alignment: 'center',fontSize: 11 }
        ]);
        let entryCount = 1;
        for(const item of bookings)
        {
            if(!item.child.isActive()){

                continue;
            }

            if(item.child.isDeleted){
                continue;
            }
            table.push([
                entryCount,
                {
                    text: item.child.getFullName(),
                    fontSize: 10,
                },
                '',
                '',
                '',
                '',
                '',
                '',
                ''
            ])
            entryCount++;
        }

        return table;
    }

    /**
     * download pdf
     *
     * @returns {Promise<any>}
     */
    printTimeSheet(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._bookingService
                .getBookingsForTimeSheet(this.fc.rooms.value, DateTimeHelper.getUtcDate(this.fc.date.value))
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    response => 
                    {
                        const pageTitle = this._authService.getClient().organization +' \t'+ '-  ' +this._authService.getClient().name + ' \n Sign-in Sheet';
                        const pageType = 'A4';
                        const isLandscape = false;

                        let content = [
                            { text: pageTitle + ` for ${DateTimeHelper.parseMoment(this.fc.date.value).format(AppConst.dateTimeFormats.dateOnly)}`, style: 'header' },
                            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
                        ];

                        content = [...content, ...this.getPrintViewContent(response)]

                        const styles = {
                            header: {
                                fontSize: 16,
                                margin: [0 , 0, 0, 8],
                            },
                            room: {
                                fontSize: 12,
                                margin: [0 ,8 , 0, 0],
                                color: '#969696'
                            },
                            table: {
                                fontSize: 11,
                                margin: [0, 10, 0, 0]
                            }
                        }
                
                        this._pdfService
                            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
                            .then(() => 
                            {
                                // setTimeout(() => this.destroyModal(), 150); 

                                resolve(null); 
                            })
                            .catch(error => { reject(error) })
                    },
                    errorResponse => 
                    {
                        this._notificationService.displaySnackBar(errorResponse.error.message, NotifyType.ERROR);

                        reject();
                    }
                );
        });
    }

    /**
     * close modal
     */
    destroyModal(): void
    { 
        this._modal.destroy();
    }
    
}
