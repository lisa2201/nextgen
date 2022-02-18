import { Resolve } from '@angular/router';
import { Injectable } from '@angular/core';
import {ServiceSetupService} from '../../account-manager/service-setup/services/service-setup.service';

@Injectable({providedIn: 'root'})
export class PingCcmsService implements Resolve<any> {

    constructor(
        private _serviceSetupService: ServiceSetupService
    ) {}

    resolve(): any {

        return new Promise((resolve, reject) => {

            this._serviceSetupService.getServices()
                .subscribe(
                    (response: any) => {
                        this._serviceSetupService.services = response;
                        this._serviceSetupService.onServiceChanged.next([...response]);
                        resolve();
                    },
                    reject
                );

        });

    }

}
