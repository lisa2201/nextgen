import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { FinancePaymentPlan } from 'app/main/modules/finance/finance-accounts/finance-payment-plan.model';
import { ParentPaymentMethod } from 'app/main/modules/finance/parent-payment-method/parent-payment-method.model';

export class FinanceReportModel {

    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    balance: number;
    lastPaymentDate?: string;
    paymentMthodConfigured?: boolean;
    paymentSchedulesConfigured: boolean;
    phoneNumber: string;
    email: string;
    childrenDetails:string;
    transaction:any = [];
    WeekEnding: any;
    ccsPayment: any[];
    weekStarting: Date;
    weeEnding: Date;
    paymentMethods: ParentPaymentMethod[];
    paymentSchedules: FinancePaymentPlan[];
    activePaymentSchedule?: FinancePaymentPlan;
    activePaymentMethod?: ParentPaymentMethod;
    nextPaymentDate?: string;


    children: Child[];

    index: number;

    constructor(item?: any, index?: number) {

        this.id = item.id;
        this.firstName = item.first_name;
        this.lastName = item.last_name;
        this.balance = item.balance;
        // this.lastPaymentDate = item.last_payment_date;
        // this.paymentMthodConfigured = item.payment_method_configured || false;
        // this.paymentSchedulesConfigured = item.payment_schedules_configured || false;
        this.paymentMethods = item.payment_methods ? item.payment_methods.map((i:any, idx: number) => new ParentPaymentMethod(i, idx)) : [];
        this.paymentSchedules = item.payment_schedules ? item.payment_schedules.map((i:any, idx: number) => new FinancePaymentPlan(i, idx)) : [];
        this.phoneNumber = item.phone || '';
        this.email = item.email || '';
        this.childrenDetails = item.children_etails || ''
        this.transaction = item.transaction || [];
        this.children = item.child ? item.child.map((i: any, idx: number) => new Child(i, idx)) : [];
        this.index = index || 0;
        this.WeekEnding = item.week_ending || '';
        this.ccsPayment = item.ccs_payment|| [];
        this.weekStarting = item.week_starting|| '';
        this.fullName = this.getFullName();

        this.checkSchedules();
        this.checkPaymentMethods();
    }

    checkSchedules(): void {
        const schedule = _.find(this.paymentSchedules, {status: 'active'});

        if (schedule) {
            this.lastPaymentDate = schedule.lastPaymentDate;
            this.nextPaymentDate = schedule.nextPaymentDate;
            this.activePaymentSchedule = schedule;
        } else {
            this.lastPaymentDate = null;
            this.nextPaymentDate = null;
            this.activePaymentSchedule = null;
        }

    }

    checkPaymentMethods(): void {

        const method = _.find(this.paymentMethods, {status: true});

        if (method) {
            this.activePaymentMethod = method;
        } else {
            this.activePaymentMethod = null;
        }

    }

    getFullName(): string {
        return `${_.capitalize(this.firstName)} ${_.capitalize(this.lastName)}`;
    }

    getValue(refe:any): any {

        let returnData: any = '';
        if(refe === 'bookingFee') {
            returnData = this.getBookingAmount();
            // returnData = this.transaction[0].transaction_type;
        }
        else if(refe === 'ccsPayment'){
            returnData = this.getCCSAmount();
        }
        else if(refe === 'phoneNumber'){
            returnData = this.phoneNumber || 'N/A';
        }
        else if(refe === 'email'){
            returnData = this.email || 'N/A';
        }
        else if(refe === 'firstName'){
            returnData = this.firstName || 'N/A';
        }
        else if(refe === 'lastName'){
            returnData = this.lastName || 'N/A';
        }

        else if(refe === 'fullName'){
            returnData = this.getFullName() || 'N/A';
        }

        else if(refe === 'income'){
            returnData = this.getTotalAmount();
        }

        else if(refe === 'WeekEnding'){
            returnData = this.WeekEnding;
        }
        else if(refe === 'ccsApi'){
            returnData = this.getCCSPaymentApi();
        }
        
        else {
            returnData = 'N/A';
        }

        return returnData;
    }
// [{"name":"Full Name","res":"fullName","isSaved":false},{"name":"Date Last Payed","res":"lastPaymentDate","isSaved":false},{"name":"Total Owing","res":"balance","isSaved":false},{"name":"Next Payment Date","res":"payment_schedules_configured","isSaved":false}]
    getBookingAmount(): any {
        return _.sum(_.map(_.filter(this.transaction, (val) => val.transaction_type === 'fee'), 'amount')) || '0';
    }

    getCCSAmount(): any {
        return _.sum(_.map(_.filter(this.transaction, (val) => val.transaction_type === 'subsidy_payment'), 'amount')) || '0';
    }

    getTotalAmount(): any {
        return (_.sum(_.map(_.filter(this.transaction, (val) => val.transaction_type === 'subsidy_payment'), 'amount'))) + (_.sum(_.map(_.filter(this.transaction, (val) => val.transaction_type === 'fee'), 'amount'))) || '0' ;
    }

    // getCCSPaymentApi(): any {
    //     return _.sum(_.map(_.filter(this.ccsPayment, (val) => val.sessionReportStartDate  > this.weekStarting && val.date_paid < this.WeekEnding), this.ccsPayment['amount'])) || '0';
    // }

    getCCSPaymentApi(): any {
        return _.sum(_.map(_.filter(this.ccsPayment, (val) => val.sessionReportStartDate  > this.weekStarting), 'amount')) || '0';
    }



    
       
}

export interface FinanceReportType {
    value: string;
    name: string;
}