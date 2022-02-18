import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { Child } from '../../child.model';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormGroupName, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'child-view-cultural-background-view',
  templateUrl: './cultural-background-view.component.html',
  styleUrls: ['./cultural-background-view.component.scss'],
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class CulturalBackgroundViewComponent implements OnInit {

  // Private
  private _unsubscribeAll: Subject<any>;

  aboriginals: string[];
  childCuturalForm: FormGroup;

  @Input() selected: Child;

  @Output()
  updateScroll: EventEmitter<any>;

  @Output()
  updateSelected: EventEmitter<any>;

  culturalrequirementschecked: boolean;
  religiousrequirementschecked: boolean;

  constructor(

  ) {

    this.updateScroll = new EventEmitter();
    this.updateSelected = new EventEmitter();

    // Set the private defaults
    this._unsubscribeAll = new Subject();

    this.aboriginals = [
      'Aboriginal not TS Islander',
      'TS Islander not Aboriginal',
      'Aboriginal and TS Islander',
      'Not Aboriginal nor TS Islander',
      'Not stated'
    ];

    this.childCuturalForm = this.createForm();

    this.culturalrequirementschecked = false;
    this.religiousrequirementschecked = false;
  }

  ngOnInit() {
    this.setCulturalFormValues();
    this.onChanges();
  }

  onChanges(): void {

    
    this.childCuturalForm.valueChanges.subscribe(val => {

      // setTimeout(() => this.onBranchChanged.next([...this.branches]), 350);

      const sendObj = {
        id: this.selected.cultural.id,
        ab_or_tsi: this.fc.ab_or_tsi.value,
        cultural_background: this.fc.cultural_background.value,
        language: this.fc.language.value,
        cultural_requirements_chk: this.fc.cultural_requirements_chk.value,
        cultural_requirements: (this.fc.cultural_requirements_chk.value) ? this.fc.cultural_requirements.value : null,
        religious_requirements_chk: this.fc.religious_requirements_chk.value,
        religious_requirements:(this.fc.religious_requirements_chk.value) ? this.fc.religious_requirements.value : null
      }

      console.log
      
      this.updateSelected.next({
        item: sendObj
    });
    });
  }

  createForm(): FormGroup {

    return new FormGroup({
      ab_or_tsi: new FormControl(null),
      cultural_background: new FormControl(''),
      language: new FormControl(''),
      cultural_requirements: new FormControl(''),
      cultural_requirements_chk: new FormControl(''),
      religious_requirements_chk: new FormControl(''),
      religious_requirements: new FormControl(null),
    });
  }

  /**
  * set form values
  */
  setCulturalFormValues(): void {

    if(this.selected.cultural.cultural_requirements_chk == '1'){
      this.culturalrequirementschecked = true;
    }

    if(this.selected.cultural.religious_requirements_chk == '1'){
      this.religiousrequirementschecked = true;
    }

    this.childCuturalForm.get('ab_or_tsi').patchValue(this.selected.cultural.ab_or_tsi, { emitEvent: false });
    this.childCuturalForm.get('cultural_background').patchValue(this.selected.cultural.cultural_background, { emitEvent: false });
    this.childCuturalForm.get('language').patchValue(this.selected.cultural.language, { emitEvent: false });
    this.childCuturalForm.get('language').patchValue(this.selected.cultural.language, { emitEvent: false });
    this.childCuturalForm.get('cultural_requirements_chk').patchValue(this.culturalrequirementschecked, { emitEvent: false });
    this.childCuturalForm.get('cultural_requirements').patchValue(this.selected.cultural.cultural_requirements, { emitEvent: false });
    this.childCuturalForm.get('religious_requirements_chk').patchValue(this.religiousrequirementschecked, { emitEvent: false });
    this.childCuturalForm.get('religious_requirements').patchValue(this.selected.cultural.religious_requirements, { emitEvent: false });


  }

  /**
  * convenience getter for easy access to form fields
  */
  get fc(): any {
    return this.childCuturalForm.controls;
  }

  onCulturalRequirement(mode: boolean): void {
    if (mode == true) {
      this.culturalrequirementschecked = true;
    }
    else {
      this.culturalrequirementschecked = false;
      this.fc.cultural_requirements.value = null;
    }
  }

  onReligiousRequirementsChange(mode: boolean): void {

    if (mode == true) {
      this.religiousrequirementschecked = true;
    }
    else {
      this.religiousrequirementschecked = false;
      this.fc.religious_requirements.value = null;
    }
  }
}
