import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { Subject } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { User } from 'app/main/modules/user/user.model';
import { FinanceAccountTransaction } from '../../../finance-account-transactions/finance-account-transaction.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import * as moment from 'moment';
import * as _ from 'lodash';
import { Branch } from 'app/main/modules/branch/branch.model';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { ProviderSetup } from 'app/main/modules/account-manager/provider-setup/models/provider-setup.model';
import { ServiceSetup } from 'app/main/modules/account-manager/service-setup/models/service-setup.model';
import { ParentPaymentMethod } from '../../../parent-payment-method/parent-payment-method.model';

interface SessionSummary {
    date: string;
    full_name: string;
    session_start: string;
    session_end: string;
    sign_in: string;
    sign_out: string;
    hours: string;
    fee: string;
    hourly_fee: string;
}

interface Entitlement {
    full_name: string;
    week: string;
    hours_total: string;
    fee_total: string;
    ccs_hours_total: string;
    accs_total: string;
    ccs_total: string;
    gap: string;
}

interface Absence {
    full_name: string;
    enrolment_id: string;
    absent_days: string;
}

@Component({
    selector: 'app-parent-statement-preview-view',
    templateUrl: './parent-statement-preview-view.component.html',
    styleUrls: ['./parent-statement-preview-view.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ParentStatementPreviewViewComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    loadedData: any;

    transactions: FinanceAccountTransaction[];
    sessionSummaries: SessionSummary[];
    absences: Absence;
    entitlements: Entitlement[];
    organization: Organization;
    provider?: ProviderSetup | null;
    service?: ServiceSetup | null; 
    parent: User;
    branch:Branch;
    badgeStyle = {
        backgroundColor: '#dedede',
        color: '#484848ed'
    };
    tagColor = 'lightgrey';
    dateFormatAng = 'dd-MM-yyyy';

    startDate: string;
    endDate: string;
    paymentDate: string;
    generatedDate: any;
    openingBalance: any;
    creditTotal: string;
    debitTotal: string;
    closingBalance: any;
    ccsEnabled: boolean;
    math = Math;
    logoUrl: string;
    bpay?: ParentPaymentMethod | null;
    limitedSubsidy: boolean;

    dateFormat = 'll';
    waiveFeeTitle = 'Waived Gap Fee';

    constructor(
        public matDialogRef: MatDialogRef<ParentStatementPreviewViewComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _authService: AuthService,
        private _commonService: CommonService,
        private _formBuilder: FormBuilder
    ) {

        this.unsubscribeAll = new Subject();

        this.loadedData = this._data.loaded_data;

        this.transactions = this.loadedData.transactions.map((val: any, index: number) => new FinanceAccountTransaction(val, index));
        this.organization = new Organization(this.loadedData.organization);
        this.branch = new Branch(this.loadedData.branch);
        this.parent = new User(this.loadedData.parent);
        this.service = this.loadedData.service ? new ServiceSetup(this.loadedData.service) : null;
        this.provider = this.loadedData.provider ? new ProviderSetup(this.loadedData.provider) : null;
        this.bpay = this.loadedData.bpay ? new ParentPaymentMethod(this.loadedData.bpay) : null;
        this.limitedSubsidy = this.loadedData.limited_subsidy ? true : false;

        this.sessionSummaries = this.loadedData.session_summary ? this.loadedData.session_summary : [];
        this.entitlements = this.loadedData.entitlements ? this.loadedData.entitlements : [];
        this.absences = this.loadedData.absences ? this.loadedData.absences : [];
        this.openingBalance = this.loadedData.opening_balance;
        this.closingBalance = Math.abs(_.last(this.transactions).runningTotal);
        this.debitTotal = this.loadedData.debit_total;
        this.creditTotal = this.loadedData.credit_total;
        this.ccsEnabled = this.loadedData.ccs_enabled;

        this.startDate = moment(this._data.start_date).format(this.dateFormat);
        this.endDate = moment(this._data.end_date).format(this.dateFormat);
        this.paymentDate = this.loadedData.payment_date ? moment(this.loadedData.payment_date).format(this.dateFormat) : null;
        this.generatedDate = moment().format(this.dateFormat);

        this.logoUrl = this._authService.getClient().branchLogo ? this._commonService.getS3FullLink(this._authService.getClient().branchLogo) : 'assets/images/logos/KMLOGO.png';

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    getTransactionDescription(transaction: FinanceAccountTransaction): string {

        if (transaction.transactionType === 'adjustment') {
            return transaction.adjustmentItemName;
        } else {
            return transaction.getTransactionType();
        }

    }

    getTransactionDiffDate(transaction: FinanceAccountTransaction): string {

        if (!moment(transaction.date, 'YYYY-MM-DD').isSame(transaction.createdAt, 'date')) {
            return `(${moment(transaction.date, 'YYYY-MM-DD').format('DD-MM-YYYY')})`;
        } else {
            return '';
        }

    }

    getChildFullname(name: string): string {
        return _.startCase(_.toLower(name));
    }

    getHours(transaction: FinanceAccountTransaction ): string {

        if (transaction.sessionEnd && transaction.sessionStart) {
            return `(${((transaction.sessionEnd - transaction.sessionStart) / 60).toFixed(2)} Hours)`;
        } else {
            return '';
        }

    }

    getWaiveDays(transaction: FinanceAccountTransaction): string {

        let days = '';

        if (transaction?.adjustmentProperties && transaction?.adjustmentProperties?.days) {
        
            let days_arr = _.map(_.filter(transaction.adjustmentProperties.days, (val: any) => val.value), (val) => moment().isoWeekday(val.index).format('dd'));
            days = `Date Range: From ${transaction.adjustmentStartDate} to ${transaction.adjustmentEndDate} Days: ${_.join(days_arr, ',')}`;
            
        }
    
        return days;

    }

}
