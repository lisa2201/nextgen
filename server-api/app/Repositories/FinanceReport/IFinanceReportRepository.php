<?php

namespace Kinderm8\Repositories\FinanceReport;

use Illuminate\Http\Request;

interface IFinanceReportRepository
{
    public function getAgedDebtorsReport(Request $request, string $user_model);

    public function getIncomeSummaryReport(Request $request, string $user_model);

    public function incomeSummeryReport(Request $request, string $user_model);

    public function transactionListingReport(Request $request);

    public function accountBalanceReport(Request $request);

    public function bondReport(Request $request);

    public function financialAdjustmentData(Request $request);

    public function getWeeklyRevenueSummaryReport(Request $request);

    public function getOpeningBalanceReport(Request $request);

    public function Weekly(Request $request, string $user_model);

    public function getGapFeeReportData(Request $request);

    public function bankingSummaryReportData(Request $request);
}
