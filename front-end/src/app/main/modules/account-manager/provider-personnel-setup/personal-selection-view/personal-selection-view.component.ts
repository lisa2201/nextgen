import { Component, OnInit } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

@Component({
  selector: 'provider-personal-selection-view',
  templateUrl: './personal-selection-view.component.html',
  styleUrls: ['./personal-selection-view.component.scss'],
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
]
})
export class PersonalSelectionViewComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
