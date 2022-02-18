import { Child } from '../../child/child.model';
import { User } from '../../user/user.model';
import { Branch } from '../../branch/branch.model';
import { Organization } from '../../organization/Models/organization.model';
import { AdjustmentItem } from '../../service-settings/adjustment-items/adjustment-item.model';

export class FinanceAccountTransaction {

    id: string;
    date: string;
    transactionType: string;
    mode: string;
    amount: number;
    runningTotal: number;
    createdAt: string;
    description: string;
    referenceId: string;
    reversed: boolean;

    parent?: User;
    child?: Child;
    organization?: Organization;
    branch?: Branch;

    adjustmentItemName?: string | null;
    sessionStart?: number | null;
    sessionEnd?: number | null;
    roomName?: string | null;
    adjustmentStartDate?: string;
    adjustmentEndDate?: string;
    adjustmentProperties?: {days: []};

    index: number;

    constructor(transaction: any, index: number) {

        this.id = transaction.id;
        this.date = transaction.date;
        this.transactionType = transaction.transaction_type;
        this.mode = transaction.mode;
        this.amount = transaction.amount;
        this.runningTotal = transaction.running_total;
        this.createdAt = transaction.created_at;
        this.description = transaction.description;
        this.referenceId = transaction.ref_id;
        this.reversed = transaction.reversed;

        // Optional for specific scenario
        this.adjustmentItemName = transaction.item_name;
        this.sessionStart = transaction.session_start;
        this.sessionEnd = transaction.session_end;
        this.roomName = transaction.room_name;
        this.adjustmentEndDate = transaction.adjustment_end_date;
        this.adjustmentStartDate = transaction.adjustment_start_date;
        this.adjustmentProperties = transaction.adjustment_properties;
        
        this.parent = transaction.parent ? new User(transaction.parent) : null;
        this.child = transaction.child ? new Child(transaction.child) : null;
        this.organization = transaction.organization ? new Organization(transaction.organization) : null;
        this.branch = transaction.branch ? new Branch(transaction.branch) : null;

        this.index = index || 0;
        
    }

    getTransactionType(): string {

        let transactionType = '';

        switch (this.transactionType) {
            case 'fee':
                transactionType = 'Daily Fee';
                break;
            case 'subsidy_payment':
                transactionType = 'CCS Subsidy Payment';
                break;
            case 'parent_payment':
                transactionType = 'Parent Payment';
                break;
            case 'parent_payment_refund':
                transactionType = 'Parent Payment Refund';
                break;
            case 'adjustment':
                transactionType = 'Adjustment';
                break;
            case 'account_balance':
                transactionType = 'Balance Adjustment';
                break;
            case 'subsidy_estimate':
                transactionType = 'Daily CCS Estimate';
                break;
            case 'ccs_payment':
                transactionType = 'Weekly Actual CCS Payment';
                break;
            case 'accs_payment':
                transactionType = 'Weekly Actual ACCS Payment';
                break;
            default:
                transactionType = '';
                break;
        }

        return transactionType;

    }

}
