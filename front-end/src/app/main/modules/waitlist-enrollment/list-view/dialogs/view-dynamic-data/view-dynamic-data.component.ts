import {Component, Inject, Input, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {CommonService} from 'app/shared/service/common.service';
import {AppConst} from 'app/shared/AppConst';
import {CountryResolverService} from '../../../../waitlist-form-config/services/country-resolver.service';
import {Country} from 'app/shared/model/common.interface';

import * as _ from 'lodash';

@Component({
    selector: 'view-dynamic-data',
    templateUrl: './view-dynamic-data.component.html',
    styleUrls: ['./view-dynamic-data.component.scss']
})
export class ViewDynamicDataComponent implements OnInit {

    @Input() sectionsCollection: any
    @Input() waitlistInfo: any
    @Input() type: string;
    @Input() allergiesList: any[];

    countriesList: Country[] = []; // Country Select
    countryName: any;
    additionalCarerCountry: any;

    bookingsdisplay: any;
    allergyMappedArray: any[];

    constructor(
        private _commonService: CommonService,
        public _countryResolverService: CountryResolverService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {
        this.countryName = {name: 'N/A'};
        this.additionalCarerCountry = {name: 'N/A'};
        this.bookingsdisplay = [];
        this.allergyMappedArray = [];
    }

    ngOnInit(): void {
        this.bookingsdisplayDirect()
        this._setInitData();
        this.setAllergyData();
    }

    /**
     * Set select data
     */
    _setInitData(): void {
        this._countryResolverService
            .resolve()
            .pipe()
            .subscribe((value: any) => {
                this.countriesList = value[0];
                this.getCountryName();
            })
    }

    setAllergyData(): void {

        if (_.isEmpty(this.allergiesList) || _.isEmpty(this.waitlistInfo?.allergiesArray)) {
            this.allergyMappedArray = [];
        } else {

            this.allergyMappedArray = _.map(this.waitlistInfo.allergiesArray, (value) => {

                const allergy = _.find(this.allergiesList, {index: value.allergies});

                return {
                    detail: value.detailsOfAllergies || '',
                    name: allergy?.name || ''
                }
            });

        }

    }

    bookingsdisplayDirect(): any {
        let ampm: string;
        const bookingsdisplay = [];
        for (const key in this.waitlistInfo.bookings) {
            ampm = this.waitlistInfo.bookings[key]['mornings'];
            for (const key2 in this.waitlistInfo.bookings[key]) {
                if (this.waitlistInfo.bookings[key][key2] === true && key2 !== 'mornings') {
                    if (key2 in bookingsdisplay) {
                        bookingsdisplay[key2] = bookingsdisplay[key2] + ',' + ampm;
                    } else {
                        bookingsdisplay[key2] = ampm;
                    }
                }

            }
        }
        console.log('this.bookingsdisplay')
        console.log(bookingsdisplay)
        this.bookingsdisplay = bookingsdisplay;
        // return bookingsdisplay;
    }

    getCountryName(): void {
        if (this._data.response.waitlist.waitlist_info?.parent_country) {
            this.countryName = this.countriesList.find(e => e.code === this._data.response.waitlist.waitlist_info.parent_country);
        }
        if (this._data.response.waitlist.waitlist_info.new_inputs.find(x => x.name === 'additionalCarerCountry')?.values) {
            this.additionalCarerCountry = this.countriesList.find(e => e.code === this._data.response.waitlist.waitlist_info.new_inputs.find(x => x.name === 'additionalCarerCountry')['values']);
        }
    }

    getInputIndex(index): any {
        const Newindex = this.type === AppConst.appStart.WAITLIST.NAME ? this.waitlistInfo.new_inputs.findIndex(x => x.name === index && x.waitlist_section !== '') : this.waitlistInfo.new_inputs.findIndex(x => x.name === index && x.section !== '');
        return {
            question: this.waitlistInfo.new_inputs[Newindex]['question'],
            name: this.waitlistInfo.new_inputs[Newindex]['name'],
            type: this.waitlistInfo.new_inputs[Newindex]['input_type'],
            options: this.waitlistInfo.new_inputs[Newindex]['types'],
            values: (typeof this.waitlistInfo.new_inputs[Newindex]['values'] === 'object' && this.waitlistInfo.new_inputs[Newindex]['values'] !== null) ? this.waitlistInfo.new_inputs[Newindex]['values'] : this.waitlistInfo.new_inputs[Newindex]['values'],
        }
    }

    getFileName(key: string): string {
        return this._commonService.extractS3FileName(key);
    }

    gotoPage(url): void {
        window.open((url.includes('http://') || url.includes('https://')) ? url : 'http://' + url, '_blank');
    }

    hasAllergy(): boolean {
        return _.isArray(this.waitlistInfo.allergiesArray) && !_.isEmpty(this.waitlistInfo.allergiesArray);
    }

}
