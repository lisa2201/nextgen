import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Validators, FormGroup, FormBuilder } from '@angular/forms';
import { style } from '@angular/animations';
@Component({
    selector: 'app-provider-personnel-setup',
    templateUrl: './provider-personnel-setup.component.html',
    styleUrls: ['./provider-personnel-setup.component.scss'],
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ],

    encapsulation: ViewEncapsulation.None
})

export class ProviderPersonnelSetupComponent implements OnInit {
    validateForm: FormGroup;

  submitForm(): void {
    for (const i in this.validateForm.controls) {
      this.validateForm.controls[i].markAsDirty();
      this.validateForm.controls[i].updateValueAndValidity();
    }
  }

  requiredChange(required: boolean): void {
    if (!required) {
      this.validateForm.get('nickname')!.clearValidators();
      this.validateForm.get('nickname')!.markAsPristine();
    } else {
      this.validateForm.get('nickname')!.setValidators(Validators.required);
      this.validateForm.get('nickname')!.markAsDirty();
    }
    this.validateForm.get('nickname')!.updateValueAndValidity();
  }

    constructor(private fb: FormBuilder) { }

    ngOnInit(): void{
        this.validateForm = this.fb.group({
            name: [null, [Validators.required]],
            nickname: [null],
            required: [false]

    });

        
}
}


