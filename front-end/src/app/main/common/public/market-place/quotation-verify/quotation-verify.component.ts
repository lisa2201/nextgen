import { Component, OnInit, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';

import { helpMotion } from 'ng-zorro-antd';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { QuotationVerifyService } from './services/quotation-verify.service';


@Component({
  selector: 'app-quotation-verify',
  templateUrl: './quotation-verify.component.html',
  styleUrls: ['./quotation-verify.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    helpMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})


export class QuotationVerifyComponent implements OnInit, AfterViewInit {

  // private _unsubscribeAll: Subject<any>;
  registrationMode: boolean;
  verifyMode: boolean;
  quotationVerifyToken: string;
  verifyProcessing: boolean;
  verfiySuccess: boolean;
  showVerifyResend: boolean;
  verifyMessage: string;
  currentYear: number;

  /**
   * 
   * @param {ActivatedRoute} _route 
   * @param {QuotationVerifyService} _quoteService 
   * @param {NGXLogger} _logger 
   */
  constructor(
    private _route: ActivatedRoute,
    private _quoteService: QuotationVerifyService,
    private _logger: NGXLogger,
  ) {
    this.verfiySuccess = null;
    this.showVerifyResend = false;
    this.currentYear = new Date().getFullYear();

    if (this._route.snapshot.queryParams['quotation-token']) {
      this.quotationVerifyToken = this._route.snapshot.queryParams['quotation-token'];
      this.registrationMode = false;
      this.verifyMode = true;
      this.verifyProcessing = true;
    }
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    // 
  }

  /**
     * After View Init
  */
  ngAfterViewInit(): void {

    setTimeout(() => {
      this._verifyEmail();
    }, 1000);

  }


  /**
     * Email Verify
     */
  private _verifyEmail(): void {
    this._quoteService.verifyEmail({ token: this.quotationVerifyToken })
      .pipe(
        finalize(() => {
          this.verifyProcessing = false;
        })
      )
      .subscribe(
        (response: { active: boolean, expired: boolean, message: string }) => {
          this._logger.info(response);

          this.verifyMessage = response.message;

          if (response.active) {
            this.verfiySuccess = true;
          } else {

            if (response.expired) {
              this.showVerifyResend = true;
            } else {

              this.verfiySuccess = false;
            }

          }
        }
      );
  }




}
