import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { helpMotion } from 'ng-zorro-antd';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Organization } from '../../Models/organization.model';
import { NotificationService } from 'app/shared/service/notification.service';
import { OrganizationService } from '../../services/organization.service';
import { OrganizationSubscription } from '../../Models/organizationSubscription.model';
import { Addon } from 'app/main/common/public/market-place/addon.model';

@Component({
  selector: 'app-additional-details',
  templateUrl: './additional-details.component.html',
  styleUrls: ['./additional-details.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    helpMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class AdditionalDetailsComponent implements OnInit, OnDestroy {

  private _unsubscribeAll: Subject<any>;

  action: string;
  dialogTitle: string;
  organizationForm: FormGroup;
  buttonLoader: boolean;
  // organizations: Organization[];
  levels: any;
  showRolesControl: boolean;
  paymentFrequencyList: string[] = [];
  subscriptionList: string[] = [];
  unitList: any;
  date;
  editMode: boolean;

  // billing types
  child: boolean;
  educator: boolean;
  fixed: boolean;
  startingAt: boolean;

  // switch
  switchValue: boolean;

  // approve
  mapOfId: { [key: string]: boolean } = {};
  pageIndex: any;
  pageSize: any;
  pageSizeChanger: boolean;

  orgId: any;
  QuotationInfo: any;
  QuotationList: OrganizationSubscription[];
  AddonList: Addon[];


  // form data
  subscriptions: FormArray;
  subs: FormGroup;
  minPrice: number;
  agreedPrice: number;
  startingAtPrice: number;
  controls;

  disable: boolean;


  /**
   * Constructor
   * @param matDialogRef 
   * @param {NGXLogger} _logger 
   * @param {OrganizationService} _organizationService 
   * @param {any} _data 
   * @param {FormBuilder} formBuilder 
   */
  constructor(
    public matDialogRef: MatDialogRef<AdditionalDetailsComponent>,
    private _logger: NGXLogger,
    private _organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    @Inject(MAT_DIALOG_DATA) private _data: any
  ) {
    this._logger.debug('[organization data]', _data.response);
    this.editMode = false;
    this.buttonLoader = false;
    this.showRolesControl = false;

    // Set the private defaults
    this._unsubscribeAll = new Subject();

    // Set the defaults
    this.action = _data.action;
    // this.levels = _data.response.depends.levels;

    if (this.action === AppConst.modalActionTypes.EDIT) {
      this.dialogTitle = 'Edit Quotation';
      this.editMode = (_data.response && _data.response.organization);
    }
    else {
      this.dialogTitle = 'Send Quotation';
      this.editMode = (_data.response && _data.response.organization);
    }

    // this.controls = [];
    // this.organizationForm = this.createForm();

    this.paymentFrequencyList = [
      'monthly',
      'annually',
      'quaterly'
    ];

    this.subscriptionList = [
      'monthly',
      'annually'
    ];



    this.unitList = [
      {
        name: 'No. of active children',
        value: 'child'
      },
      {
        name: 'No. of active Staff',
        value: 'educator'
      },
      {
        name: 'fixed',
        value: 'fixed'
      }
    ];


    this.child = false;
    this.educator = false;
    this.fixed = false;
    this.startingAt = false;
    this.switchValue = false;
    this.disable = null;
  }



  /**
   * On Init
   */
  ngOnInit(): void {

    // console.log(this.route.snapshot.data);
    this.orgId = this._data.response.organization.id;
    this._logger.debug('quotation view!!!');
    // this.onChanges();
    // this.billingTypeChange();


    this.createForm();

    this.QuotationList = this._data.response.quote.data;
    this.AddonList = this._data.response.addon;
    console.log(this.QuotationList);

    if (this.editMode) {
      // this.organizationForm.get('unitType').updateValueAndValidity();
      this.loadAddon();
    }
    this.invoiceTypeChange();
    this.controls = this.organizationForm.get('subscriptions')['controls'];
    console.log(this.controls);
    console.log(this.organizationForm);
    console.log(this.organizationForm.get('subscriptions'));
  }

  // getQuote(id: string): void {
  //   this._organizationService.getQuotationInfo(id)
  //     .subscribe(
  //       (response) => {
  //         setTimeout(() => this._notification.displaySnackBar(response, NotifyType.SUCCESS), 200);
  //         this.QuotationInfo = response.data;
  //         console.log(response);
  //       },
  //       error => {
  //         throw error;
  //       });
  // }


  /**
   * load addon list
   */
  loadAddon(): void {
    this.QuotationList.forEach((item: any, index) => {

      // this.addonName = item.addon.title;
      // const eventType  = this.organizationForm.get('subscriptions')['controls'][index]['controls']['unitType'];


      this.addExistingItem(
        item.id,
        item.minimum_price,
        item.price,
        item.unit_type,
        item.addon_id,
        item.addon.title,
      );


      // if (_.find(this.AddonList, {'id': item.addon.id})){

      console.log(_.find(this.AddonList, { 'id': item.addon.id }));
      const ind = _.findIndex(this.AddonList, { 'id': item.addon.id });
      console.log('index is ' + ind);
      this.AddonList.splice(ind, 1);
      // }

      this.unitTypeChange(item.unit_type, index);
      // console.log(item.unit_type);
      // this.unitTypeChangeExisting(index);
      // this.organizationForm.get('subscriptions')['controls'][index]['controls']['minimumPrice'].patchValue(item.unit_type);

    });

  }


  /**
   * On Changes
   */
  onChanges(): void {
    //
  }


  /**
   * On Destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }


  /**
   * get
   */
  get fc(): any {
    return this.organizationForm.controls;
  }


  /**
   * Form
   */
  createForm(): void {
    // 

    this.organizationForm = this.formBuilder.group({
      // return new FormGroup({

      billingFrequency: new FormControl(this.editMode ? this._data.response.organization.paymentFrequency : null, [Validators.required]),
      subscription: new FormControl(this.editMode ? this._data.response.organization.subscription : null, [Validators.required]),
      invoiceGeneration: new FormControl(this.editMode ? this._data.response.quote.data.invoiceGeneration : null),
      paymentMethod: new FormControl(this.editMode ? this._data.response.quote.data.paymentMethod : null),
      addon: new FormControl(null),

      subscriptions: this.formBuilder.array([])

    });
  }



  /**
   * Edit subscription
   * @param {string} id 
   * @param {string} type 
   * @param {number} price 
   * @param {number} minPrice 
   * @param {string} unitType 
   * @param {string} addonId 
   */
  createSubscription(id: string, type: string, minPrice: number, price: number, unitType: string, addonId: string, addonName: string): FormGroup {

    return this.formBuilder.group({
      agreedPrice: new FormControl(price),
      unitType: new FormControl(unitType, [Validators.required]),
      minimumPrice: new FormControl(minPrice),
      id: new FormControl(id),
      type: new FormControl(type),
      addonId: new FormControl(addonId),
      amount: new FormControl(price),
      addonName: new FormControl(addonName),

    });
  }



  /**
   * add new subscription
   * @param {string} addonId 
   * @param {string} type 
   */
  newSubscription(addonId: string, type: string, addonName: string): FormGroup {

    return this.formBuilder.group({
      agreedPrice: new FormControl(''),
      unitType: new FormControl(null, [Validators.required]),
      minimumPrice: new FormControl(''),
      addonId: new FormControl(addonId),
      type: new FormControl(type),
      amount: new FormControl(''),
      addonName: new FormControl(addonName),
    });
  }


  /**
   * add new addon
   */
  addItem(): void {
    this.subscriptions = this.organizationForm.get('subscriptions') as FormArray;
    const addonId = this.organizationForm.get('addon').value;

    console.log(_.findIndex(this.AddonList, { 'id': addonId }));
    const index = _.findIndex(this.AddonList, { 'id': addonId });

    const addonName = this.AddonList[index]['title'];
    // console.log(items[ind]['title']);

    if (addonId != null) {
      this.subscriptions.push(this.newSubscription(addonId, 'new', addonName));
      this.organizationForm.get('addon').patchValue(null);
      this.AddonList.splice(1, 1);
    }

    // console.log('id is ' + id);
    // console.log('addon list ', this.AddonList);
    // console.log('find method', _.find(this.AddonList, { 'id': id }));
    // console.log('find index ', _.findIndex(this.AddonList, { 'id': id }));
    // console.log(this.organizationForm);
  }


  /**
    * Add existing addon
     * @param {string} id 
     * @param {number} price 
     * @param {number} minPrice 
     * @param {string} unitType 
     * @param {string} addonId 
   */
  addExistingItem(id: string, price: number, minPrice: number, unitType: string, addonId: string, addonName: string): void {
    this.subscriptions = this.organizationForm.get('subscriptions') as FormArray;
    this.subscriptions.push(this.createSubscription(id, 'old', price, minPrice, unitType, addonId, addonName));

  }

  // subscriptionControls(): any {
  //   return this.organizationForm.get('subscriptions')['controls'];
  // }



  /**
   * Reset Form
   * @param {MouseEvent} e 
   */
  resetForm(e: MouseEvent): void {
    if (e) { e.preventDefault(); }

    if (e) {
      this.showRolesControl = false;
    }

    this.organizationForm.reset();

    for (const key in this.fc) {
      this.fc[key].markAsPristine();
      this.fc[key].updateValueAndValidity();
    }
  }


  /**
   * Form Submit
   * @param {MouseEvent} e 
   */
  onFormSubmit(e: MouseEvent): void {
    e.preventDefault();
    this.buttonLoader = true;

    if (this.organizationForm.invalid) {
      return;
    }

    const sendObj = {

      billingFrequency: this.fc.billingFrequency.value,
      subscription: this.fc.subscription.value,
      // // effectiveDate: this.fc.effectiveDate.value,
      invoiceGeneration: this.fc.invoiceGeneration.value,
      paymentMethod: this.fc.paymentMethod.value,

      subscriptions: this.fc.subscriptions.value,
    };
    // this._logger.debug('[organization object]', sendObj);
    this.buttonLoader = true;
    console.log(sendObj);

    // if (this.editMode) { 
    sendObj['id'] = this._data.response.organization.id;
    // }

    this._organizationService[this.editMode ? 'editQuotation' : 'editQuotation'](sendObj)

      // this._organizationService['sendQuotation'](sendObj)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        res => {
          this.buttonLoader = true;
          this.onTableChange(true);
          // this.resetForm(null);
          this.approveSingle(this._data.response.organization);
          this.buttonLoader = false;
          this.onTableChange(true);
          setTimeout(() => this.matDialogRef.close(res), 0);

        },
        error => {
          this.buttonLoader = false;
          throw error;
        },
        () => {
          this._logger.debug('😀 all good. 🍺');

        }
      );
  }


  // /**
  //  * on change
  //  */
  // onChange(result: Date): void {
  //   console.log('onChange: ', result);
  // }


  /**
   * billing type change
   */
  // billingTypeChange(): void {

  //   this.organizationForm.get('unitType').valueChanges
  //     .pipe(takeUntil(this._unsubscribeAll))
  //     .subscribe((value: any) => {


  //       const agreedPrice = this.organizationForm.get('agreedPrice');
  //       const startingPrice = this.organizationForm.get('minimumPrice');
  //       console.log(value);

  //       if (value && value.toLowerCase() === 'child') {

  //         this.child = true;
  //         this.educator = false;
  //         this.fixed = false;
  //         this.startingAt = true;

  //         agreedPrice.setValidators(Validators.required);
  //         startingPrice.setValidators(Validators.required);
  //         agreedPrice.updateValueAndValidity();
  //         startingPrice.updateValueAndValidity();
  //         agreedPrice.reset();

  //       }
  //       else if (value && value.toLowerCase() === 'educator') {

  //         this.child = false;
  //         this.educator = true;
  //         this.fixed = false;
  //         this.startingAt = true;

  //         agreedPrice.setValidators(Validators.required);
  //         startingPrice.setValidators(Validators.required);
  //         agreedPrice.updateValueAndValidity();
  //         startingPrice.updateValueAndValidity();
  //         agreedPrice.reset();

  //       } else if (value && value.toLowerCase() === 'fixed') {

  //         this.child = false;
  //         this.educator = false;
  //         this.fixed = true;
  //         this.startingAt = false;

  //         startingPrice.clearValidators();
  //         agreedPrice.setValidators(Validators.required);
  //         startingPrice.updateValueAndValidity();
  //         agreedPrice.updateValueAndValidity();
  //         agreedPrice.reset();

  //       }
  //       else {

  //         this.fixed = false;
  //         this.educator = false;
  //         this.child = false;
  //         agreedPrice.clearValidators();
  //         startingPrice.clearValidators();
  //         agreedPrice.updateValueAndValidity();


  //       }
  //     });
  // }


  /**
   * Approve Single
   * @param {Organization} item 
   */
  approveSingle(item: Organization): void {

    // e.preventDefault();
    this.mapOfId = { [item.id]: true };

    const sendObj = {
      indexs: _.keys(_.pickBy(this.mapOfId, (val) => val === true))
    };
    console.log(sendObj);

    this._organizationService.approveOrganizationCustom(sendObj)
      .subscribe(
        message => {
          // setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
          // this.checkAll(false);
          // this.onTableChange(true);

        },
        error => {
          // throw error;

        }
      );
    console.log('Approved the Custom plan!');
  }



  /**
   * On Table Change 
   * @param {boolean} reset 
   */
  onTableChange(reset: boolean = false): void {
    if (reset) {
      this.pageIndex = this._organizationService.defaultPageIndex;
    }

    this._organizationService.onPaginationChanged.next({
      page: this.pageIndex,
      size: this.pageSize
    });


  }


  /**
   * Unit type change 
   */
  unitTypeChange(event: any, index: any): void {
    console.log(event);
    console.log(index);

    const startingPrice = this.organizationForm.get('subscriptions')['controls'][index]['controls']['minimumPrice'];
    const agreedPrice = this.organizationForm.get('subscriptions')['controls'][index]['controls']['agreedPrice'];
    const amount = this.organizationForm.get('subscriptions')['controls'][index]['controls']['amount'];
    console.log(this.organizationForm.get('subscriptions')['controls'][index]['controls']['agreedPrice']);

    if (event === 'child') {


      amount.clearValidators();
      amount.reset();

      agreedPrice.setValidators(Validators.required);
      startingPrice.setValidators(Validators.required);

      agreedPrice.updateValueAndValidity();
      startingPrice.updateValueAndValidity();
      amount.updateValueAndValidity();
      // agreedPrice.reset();
      // startingPrice.reset();

    } else if (event === 'educator') {


      amount.clearValidators();
      amount.reset();

      agreedPrice.setValidators(Validators.required);
      startingPrice.setValidators(Validators.required);

      agreedPrice.updateValueAndValidity();
      startingPrice.updateValueAndValidity();
      amount.updateValueAndValidity();
      // agreedPrice.reset();
      // startingPrice.reset();

    } else if (event === 'fixed') {


      agreedPrice.clearValidators();
      startingPrice.clearValidators();
      agreedPrice.reset();
      startingPrice.reset();

      amount.setValidators(Validators.required);
      amount.updateValueAndValidity();
      // // agreedPrice.updateValueAndValidity();
      // amount.reset();

    } else {
      // agreedPrice.clearValidators();
      // startingPrice.clearValidators();
      // amount.clearValidators();
      agreedPrice.reset();
      startingPrice.reset();
      amount.reset();
      agreedPrice.updateValueAndValidity();
      startingPrice.updateValueAndValidity();
      amount.updateValueAndValidity();

    }

  }


  /**
   * Invoice type change
   */
  invoiceTypeChange(): void {

    this.organizationForm.get('billingFrequency').valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((value: any) => {


        const invoiceGeneration = this.organizationForm.get('invoiceGeneration');


        if (value && value.toLowerCase() === 'annually') {

          this.disable = true;
          invoiceGeneration.setValue(false);

        } else if (value && value.toLowerCase() === 'quaterly') {

          this.disable = true;
          invoiceGeneration.setValue(false);

        } else {
          this.disable = false;
          invoiceGeneration.reset();
        }

      });
  }


}


