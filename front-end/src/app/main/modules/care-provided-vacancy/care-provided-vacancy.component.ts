import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl, FormBuilder, Validators, FormArray } from '@angular/forms';
import { CommonService } from 'app/shared/service/common.service';
import { format, addDays, startOfWeek } from 'date-fns';
import { CareProvidedVacancyService } from './services/care-provided-vacancy.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

@Component({
  selector: 'ccs-care-provided-vacancy',
  templateUrl: './care-provided-vacancy.component.html',
  styleUrls: ['./care-provided-vacancy.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})

export class CareProvidedVacancyComponent implements OnInit {

  careProvidedform: FormGroup;
  feetype: boolean;
  // radioValue: string;
  fee_tpe_url:boolean;
  feedetails: FormArray;
  operationaldetails: FormArray;
  operationalservices: FormArray;
  ageGroups:any[];
  sessionTypes:any[];
  inclusions:any[];  
  weekdays: any;
  services: { value: string; text: string; }[];
  currentDate = new Date();
  date: string;
  day: string;
  month: string;
  year: string;
  result: Date;  
  openWeekPicker: boolean; 
  vacancies: FormArray;
  vacanciesnext: FormArray;
  allChecked: boolean;
  allChecked_next: boolean;
  buttonLoader: boolean; // have to implement
  scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
  current: number;
  currentweekstart: boolean;
  monday: string;
  _unsubscribeAll: Subject<unknown>;
  saved_data: any;
  xx: any[];
  apierrors:any[];
  status: boolean;
  
  constructor(
    private _formBuilder: FormBuilder,
    private _commonService: CommonService,
    private _careProvidedVacancyService: CareProvidedVacancyService,
    private _notification: NotificationService,
  ) { 
        
    this.careProvidedform = this.createChildForm();    
    this.ageGroups = [
      {value: '0012MN', text: '0 to 12 months'},
      {value: '1324MN', text: '13 to 24 months'},
      {value: '2535MN', text: '25 to 35 months'},
      {value: '36MNPR', text: '36 months to preschool age'},
      {value: 'OVPRAG', text: 'Over preschool age'}
    ];
    this.sessionTypes = [
      {value: 'HOURLY', text: 'Hourly'},
      {value: 'HALFDY', text: 'Half day'},
      {value: 'FULLDY', text: 'Full day'},
      {value: 'BEFSCH', text: 'Before school care (only for OSHC)'},
      {value: 'AFTSCH', text: 'After school care (only for OSHC)'}
    ];
    this.inclusions = [    
      {value: 'BRKFST', text: 'Breakfast'},
      {value: 'MORTEA', text: 'Morning Tea'},
      {value: 'LUNCH', text: 'Lunch'},
      {value: 'AFTTEA', text: 'Afternoon Tea'},
      {value: 'OTHMEA', text: 'Other Meals'},
      {value: 'NAPPIE', text: 'Nappies'},
      {value: 'TRANSP', text: 'Transport'},
      {value: 'EDUPRO', text: 'Education Programs'},
      {value: 'EXCINC', text: 'Excursions/Incursions'}
    ];
    this.weekdays = [    
      {value: '1', text: 'Monday'},
      {value: '2', text: 'Tuesday'},
      {value: '3', text: 'Wednesday'},
      {value: '4', text: 'Thursday'},
      {value: '5', text: 'Friday'},
      {value: '6', text: 'Saturday'},
      {value: '7', text: 'Sunday'}
    ];
    this.services = [    
      {value: 'NONOSH', text: 'Non OSHC'},
      {value: 'OSHBSC', text: 'OSHC – Before school care'},
      {value: 'OSHASC', text: 'OSHC – After school care'},
      {value: 'OSHVAC', text: 'OSHC – Vacation care'}
    ];
    this.feetype = true;
    // this.radioValue = 'fee_url';
    this.fee_tpe_url = true;
    this.date = format(this.currentDate,'Do'); 
    this.day = format(this.currentDate,'ddd');
    this.month = format(this.currentDate,'MMMM');
    this.year = format(this.currentDate,'yyyy');   
    this.openWeekPicker = false;
    this.allChecked = false;
    this.allChecked_next = false;
    this.current = 0;
    this.currentweekstart = true; 

    // Set the private defaults
    this._unsubscribeAll = new Subject();
    
  }

  ngOnInit(): void { 
    this.result =  new Date();
    let week_start = startOfWeek(new Date(), {weekStartsOn: 1});

    this.monday = format(week_start,'yyyy-MM-dd'); 
    this.date = format(week_start,'dd'); 
    this.day = format(week_start,'do').replace(/[0-9]/g, '');  
    this.month = format(week_start,'MMMM');  
    this.year = format(week_start,'yyyy'); 

    this.weekdays.forEach(x => {
      this.weeklyVacancies.push(this.vacancyGroup());
      this.weeklyVacanciesnext.push(this.vacancyGroupNext());
    });

    this._careProvidedVacancyService
      .onWaitlistChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        this.saved_data = response.items;

        if(this.saved_data.length === 2){
          if(this.saved_data[1].updated_at > this.saved_data[0].updated_at){
            this.apierrors = this.saved_data[1].api_errors;
          }else{
            this.apierrors = this.saved_data[0].api_errors;
          }

        }else{
          this.apierrors = (this.saved_data.length > 0) ? this.saved_data[0].api_errors : '';
        }
        this.set_form_values();
      });

  }


  /**
    * create form fields
    */
  createChildForm(): FormGroup
  {

    return this._formBuilder.group({
      
        email: new FormControl(''),
        phone: new FormControl(''),
        mobile: new FormControl(''),
        service_url: new FormControl(''),
        operationaldetails: this._formBuilder.array([this.addOperationalDayGroup()]),
        fee_type: new FormControl('fee_url'),   
        fee_url: new FormControl(''),
        feedetails: this._formBuilder.array([this.addFeeGroup()]),
        week_pick: new FormControl(''), 
        // service_operational: new FormControl(false),
        vacancies: this._formBuilder.array([]),    
        vacanciesnext: this._formBuilder.array([]),              
        
    });
  }
  

  /**
    * get form fields
    */
   get fc(): any {
    return this.careProvidedform.controls;
  }
  

  /**
    * set saved form field data
    */
  set_form_values(){
   
    let data_saved = this.saved_data[0];
    if(data_saved){
     
      data_saved.feedetails.forEach((x, index )=> {
        if(index !== 0){
          this.feeDetailsArray.push(this.addFeeGroup());
        }
      })
      
    
      this.operationalDetailsArray.removeAt(0);
      data_saved.operationaldetails.forEach((x, index )=> {
          this.operationalDetailsArray.push(this.addOperationalDayGroupEdit(x));
      })

      if(data_saved.fee_type === 'fee_details'){
        this.fee_tpe_url = false;
      }

      this.careProvidedform.patchValue({
        email: data_saved.email, 
        phone: data_saved?.phone || '', 
        mobile: data_saved?.mobile || '', 
        service_url: data_saved.service_url, 
        fee_type: data_saved.fee_type, 
        fee_url: data_saved.fee_url,
        feedetails: data_saved.feedetails,
        operationaldetails: data_saved.operationaldetails,
      })    
      
      // vacancies
      let week_start = startOfWeek(new Date(), {weekStartsOn: 1});
      let next_week_start = addDays(week_start, 7);
    
      if(this.saved_data[0].week_pick === format(week_start,'yyyy-MM-dd')){
        this.careProvidedform.patchValue({         
          vacancies: this.saved_data[0].vacancies          
        })
        
        if(this.saved_data[0].check_all === true){
          this.allChecked = true;
          this.updateAllChecked();
        }        
      }
      
      if(this.saved_data[0].week_pick === format(next_week_start,'yyyy-MM-dd')){
        this.careProvidedform.patchValue({
          vacanciesnext: this.saved_data[0].vacanciesnext
        })

        if(this.saved_data[0].check_all === true){
          this.allChecked_next = true;
          this.updateAllCheckedNext();
        }
      }

      if(this.saved_data[1]){
        
        if(this.saved_data[1].week_pick === format(week_start,'yyyy-MM-dd')){
          this.careProvidedform.patchValue({
            vacancies: this.saved_data[1].vacancies
          })

          if(this.saved_data[1].check_all === true){
            this.allChecked = true;
            this.updateAllChecked();
          }
        
        }

        if(this.saved_data[1].week_pick === format(next_week_start,'yyyy-MM-dd')){
  
          this.careProvidedform.patchValue({
            vacanciesnext: this.saved_data[1].vacanciesnext
          })
          if(this.saved_data[1].check_all === true){
            this.allChecked_next = true;
            this.updateAllCheckedNext();
          }
        }
      }
     

    }
  }
  

  /**
    * add week day group
    */
  addOperationalDayGroup(): FormGroup{
    
    return this._formBuilder.group({
      operational_day:['',Validators.required],
      operationalservices:this._formBuilder.array([this.addOperationalServiceGroup()])

    });
  }


  /**
    * add week day group - edit view
    */
  addOperationalDayGroupEdit(x): FormGroup{

    let services_array = new Array();
    x.operationalservices.forEach(serv => { 
      services_array.push(this.addOperationalServiceGroup())
    }) ;

    return this._formBuilder.group({
      operational_day:['',Validators.required],      
      operationalservices:this._formBuilder.array(services_array)

    });
  }


  /**
    * add week day service group
    */
  addOperationalServiceGroup(): FormGroup{
    
    return this._formBuilder.group({
      service_offered:['',Validators.required],
      open_time:['',Validators.required],
      end_time:['',Validators.required],

    });
  }
    

  /**
    * fee detail group
    */
  addFeeGroup(): FormGroup{

    return this._formBuilder.group({
        age_group:[null,Validators.required],
        session_type: [null,Validators.required],
        fee_amount: ['0.00',Validators.required],        
        BRKFST: [false],
        MORTEA: [false],
        LUNCH: [false],
        AFTTEA:[false],
        OTHMEA: [false],
        NAPPIE: [false],
        TRANSP: [false],
        EDUPRO: [false],
        EXCINC:[false]

      });
  }
      

  /**
    * vacancy data group
    */
  vacancyGroup(): FormGroup{
        
    return this._formBuilder.group({
      agegroup1:[false],
      agegroup2:[false],
      agegroup3:[false],
      agegroup4:[false],
      agegroup5:[false],
      permanent: [false],
      casual: [false],        
      sessiontype1: [false],
      sessiontype2: [false],
      sessiontype3: [false],
      sessiontype4: [false],
      sessiontype5: [false],
      // available_places: [null],
      });
  }


  /**
    * next week vacancy data group
    */
  vacancyGroupNext(): FormGroup{
        
    return this._formBuilder.group({
      next_agegroup1:[false],
      next_agegroup2:[false],
      next_agegroup3:[false],
      next_agegroup4:[false],
      next_agegroup5:[false],
      next_permanent: [false],
      next_casual: [false],        
      next_sessiontype1: [false],
      next_sessiontype2: [false],
      next_sessiontype3: [false],
      next_sessiontype4: [false],
      next_sessiontype5: [false],
      // next_available_places: [null],
      });
  }

  
  /**
    * select fee type
    */
  onFeeTypeChange(mode: string): void {

    if (mode === 'fee_url') {
      this.fee_tpe_url = true;
    }
    else {
      this.fee_tpe_url = false;
    }

  }

  get feeDetailsArray(){
    return this.careProvidedform.get('feedetails') as FormArray;
  }

  addNewFeeDeatil(){
      this.feeDetailsArray.push(this.addFeeGroup());
  }

  removeFeeDeatil(index){
      this.feeDetailsArray.removeAt(index);
  }

  get operationalDetailsArray(){
    return this.careProvidedform.get('operationaldetails') as FormArray;
  }

  addDay(){
      this.operationalDetailsArray.push(this.addOperationalDayGroup());
  }

  removeDay(index){
      this.operationalDetailsArray.removeAt(index);
  }
  
  get operationalServicesArray(){
    return this.careProvidedform.get('operationalservices') as FormArray;
  }

  addService(control, i , j){
    control.push(this.addOperationalServiceGroup());
      // this.operationalServicesArray.push(this.addOperationalServiceGroup());
      // if(j === 2){

      // }
  }

  removeService(control, index){
    control.removeAt(index);
    // this.operationalServicesArray.removeAt(index);
  }

  get controls(): any {        
    return this.careProvidedform.controls;
  }

  getWeekStartDay(){
    return this.date;
  }

  /**
   * open week picker
   */
  toggleWeekPicker(e: MouseEvent): void
  {
      e.preventDefault();
      this.openWeekPicker = !this.openWeekPicker;
  }

  /**
   * get week start day of selected
   */
  getWeek(result: Date): void {

    let week_start = startOfWeek(result, {weekStartsOn: 1});

    this.monday = format(week_start,'yyyy-MM-dd'); 
    this.date = format(week_start,'dd'); 
    this.day = format(week_start,'do').replace(/[0-9]/g, '');  
    this.month = format(week_start,'MMMM');  
    this.year = format(week_start,'yyyy');  

    if(this.date == format(startOfWeek(this.result, {weekStartsOn: 1}),'dd')){
      this.currentweekstart = true;
    }else{
      this.currentweekstart = false;
    }    
    this.openWeekPicker = !this.openWeekPicker;

  }

  /**
   * disable other week selection
   */
  disabledDates = (current: Date): boolean => {
    
    let week_start = startOfWeek(this.currentDate, {weekStartsOn: 1});
    return (differenceInCalendarDays.default(current, week_start) < 0 || differenceInCalendarDays.default(current, week_start) > 13);
  };
  
  get weeklyVacancies(){
    return this.careProvidedform.get('vacancies') as FormArray;
  }

  get weeklyVacanciesnext(){
    return this.careProvidedform.get('vacanciesnext') as FormArray;
  }

  /**
   * select all vacancies current week
   */
  updateAllChecked(): void {
    
    if (this.allChecked) {      
      this.status = true;
    }else{
      this.status = false;
    }

    let vacancies_all= new Array(); 
    this.weekdays.forEach(day=> {
      vacancies_all.push({
        'agegroup1':this.status,
        'agegroup2':this.status,
        'agegroup3':this.status,
        'agegroup4':this.status,
        'agegroup5':this.status,
        'permanent':this.status,
        'casual': this.status,      
        'sessiontype1': this.status,
        'sessiontype2':this.status,
        'sessiontype3': this.status,
        'sessiontype4': this.status,
        'sessiontype5': this.status
      });
    });
    
    this.careProvidedform.patchValue({
      vacancies: vacancies_all
    });
 
  }

  /**
   * select all vacancies next week
   */
  updateAllCheckedNext(): void {
    
    this.status = false;
    if (this.allChecked_next) {
      this.status = true;
    }
  
    let vacancies_next_all= new Array(); 
    this.weekdays.forEach(day=> {
      vacancies_next_all.push({
        'next_agegroup1':this.status,
        'next_agegroup2':this.status,
        'next_agegroup3':this.status,
        'next_agegroup4':this.status,
        'next_agegroup5':this.status,
        'next_permanent':this.status,
        'next_casual':this.status,     
        'next_sessiontype1':this.status,
        'next_sessiontype2':this.status,
        'next_sessiontype3':this.status,
        'next_sessiontype4':this.status,
        'next_sessiontype5':this.status
      });
    });

    this.careProvidedform.patchValue({
      vacanciesnext: vacancies_next_all
    });
   
  }

  /**
   * tab navigation previous
   */
  pre(): void
  {
      this.current -= 1;
  }

  /**
   * tab navigation new
   */
  next(): void
  {
      this.current += 1;
  }

  /**
   * update tab navigation position
   */
  updatePosition(index: number): void
  {   
      this.current = index;
  }

  /**
   * Form submit handler
   */
  onFormSubmit(): void {

    // this.buttonLoader = true;

    // if (!this.careProvidedform.valid) {
        // this.buttonLoader = false;
    //     return;
    // }


    const formValues = this.careProvidedform.value;
    
    const sendData = {
        email: formValues.email,
        phone: formValues.phone || '',
        mobile: formValues.mobile || '',
        service_url: formValues.service_url,
        operationaldetails: formValues.operationaldetails,
        fee_type: formValues.fee_type,
        fee_url: formValues.fee_url,
        feedetails: formValues.feedetails,
        vacancies: formValues.vacancies,
        vacanciesnext: formValues.vacanciesnext,
        week_pick:  this.monday,
        agegroup: formValues.agegroup,
        permanent: formValues.permanent,
        casual: formValues.casual,
        sessiontype: formValues.sessiontype,
        // available_places: formValues.available_places, 
    };

    this._careProvidedVacancyService.storeCareProvidedVacancy(sendData)
        .pipe(

        )

        .subscribe((response: any) => {
          console.log(response);
            if (!response) {
              return;
            }

            if (response.code === 201) {
                setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);

            }
            this._notification.clearSnackBar();

            setTimeout(() => {
                
                if (this.scrollDirective) {
                    this.scrollDirective.scrollToTop();
                }
            }, 300);
        });

  }

}
