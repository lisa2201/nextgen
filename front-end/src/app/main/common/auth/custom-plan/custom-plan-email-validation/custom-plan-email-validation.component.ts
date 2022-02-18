import { Component, Input, OnDestroy } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd';

@Component({
    selector: 'custom-plan-email-validation',
    templateUrl: './custom-plan-email-validation.component.html',
    styleUrls: ['./custom-plan-email-validation.component.scss']
})
export class CustomPlanEmailValidationComponent implements OnDestroy {

    @Input() content: string;
    @Input() button: boolean;
    @Input() buttonLabel: string;
    @Input() onClick: () => Promise<any>;

    isLoading = false;

    constructor(private _modal: NzModalRef) { }

    async clickMethod(): Promise<any> {

        try {

            this.isLoading = true;

            await this.onClick();

            this.isLoading = false;

            this.destroyModal();

        } catch (error) {

            this.isLoading = false;

            throw error;
        }

    }

    destroyModal(): void {
        this._modal.destroy();
    }

    ngOnDestroy(): void {
    }

}
