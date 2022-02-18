import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { AdjustmentItemsService } from './adjustment-items.service';

@Injectable()
export class AdjustmentItemsListResolverService implements Resolve<void> {

    constructor(private _adjustmentItemsService: AdjustmentItemsService) { }

    resolve(): void {
        this._adjustmentItemsService.listAdjustmentItems()
            .then(() => {
                this._adjustmentItemsService.setEvents();
            });
    }

}
