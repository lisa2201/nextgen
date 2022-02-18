import { Child } from '../../child/child.model';
import * as _ from 'lodash';
import { BondPayment } from '../bond-payment/model/bond-payment.model';
import { ParentPaymentMethod } from '../parent-payment-method/parent-payment-method.model';
import { FinancePaymentPlan } from './finance-payment-plan.model';

export class FinanceAccount {

    id: string;
    firstName: string;
    lastName: string;
    balance: number;
    lastPaymentDate?: string;
    nextPaymentDate?: string;
    paymentMethodConfigured?: boolean;
    paymentSchedulesConfigured: boolean;
    paymentMethods: ParentPaymentMethod[];
    paymentSchedules: FinancePaymentPlan[];
    activePaymentSchedule?: FinancePaymentPlan;
    activePaymentMethod?: ParentPaymentMethod;


    children: Child[];

    bond: BondPayment[];
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
        this.children = item.child ? item.child.map((i: any, idx: number) => new Child(i, idx)) : [];
        this.bond = item.bond ? item.bond.map((i: any, idx: number) => new BondPayment(i, idx)) : [];
        this.index = index || 0;

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
       
}
