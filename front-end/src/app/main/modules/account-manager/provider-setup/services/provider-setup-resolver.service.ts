import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ProviderSetupService } from './provider-setup.service';

@Injectable()
export class ProviderSetupResolverService implements Resolve<Promise<any>> {

    constructor(
        private _providerService: ProviderSetupService
    ) {}

    resolve(): Promise<any> {
        
        return new Promise((resolve, reject) => {

            this._providerService.getProviders()
            .subscribe(
                (response: any) => {
                    this._providerService.providers = response;
                    this._providerService.onProviderChanged.next([...response]);
                    resolve();
                },
                reject
            );
                
        });

    }

}
