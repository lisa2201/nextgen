<?php

namespace Kinderm8\Providers;

use Illuminate\Support\ServiceProvider;
use Kinderm8\Repositories\AllergyTypes\AllergyTypesRepository;
use Kinderm8\Repositories\AllergyTypes\IAllergyTypesRepository;
use Kinderm8\Repositories\Attendance\AttendanceRepository;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\Booking\BookingRepository;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\BookingRequest\BookingRequestRepository;
use Kinderm8\Repositories\BookingRequest\IBookingRequestRepository;
use Kinderm8\Repositories\Branch\BranchRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Bus\BusListRepository;
use Kinderm8\Repositories\School\ISchoolRepository;
use Kinderm8\Repositories\Bus\IBusListRepository;
use Kinderm8\Repositories\CCSEnrolment\CCSEnrolmentRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\CCSEntitlement\CCSEntitlementRepository;
use Kinderm8\Repositories\CCSEntitlement\ICCSEntitlementRepository;
use Kinderm8\Repositories\CCSSetup\CCSSetupRepository;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Child\ChildRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\EducatorRatio\EducatorRatioRepository;
use Kinderm8\Repositories\EducatorRatio\IEducatorRatioRepository;
use Kinderm8\Repositories\Fee\FeeRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Invitation\IInvitationRepository;
use Kinderm8\Repositories\Invitation\InvitationRepository;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\Organization\OrganizationRepository;
use Kinderm8\Repositories\Permission\IPermissionRepository;
use Kinderm8\Repositories\Permission\PermissionRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use Kinderm8\Repositories\Role\RoleRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Repositories\Room\RoomRepository;
use Kinderm8\Repositories\School\SchoolRepository;
use Kinderm8\Repositories\SessionSubmission\ISessionSubmissionRepository;
use Kinderm8\Repositories\SessionSubmission\SessionSubmissionRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Repositories\User\UserRepository;
use Kinderm8\Repositories\Contactreport\IContactReportRepository;
use Kinderm8\Repositories\Contactreport\ContactReportRepository;
use Kinderm8\Repositories\FinanceReport\IFinanceReportRepository;
use Kinderm8\Repositories\FinanceReport\FinanceReportRepository;
use Kinderm8\Repositories\EmergencyContact\IEmergencyContactRepository;
use Kinderm8\Repositories\EmergencyContact\EmergencyContactRepository;
use Kinderm8\Repositories\ParentFinanceExclusion\IParentFinanceExclusionRepository;
use Kinderm8\Repositories\ParentFinanceExclusion\ParentFinanceExclusionRepository;
use Kinderm8\Repositories\PaymentTerms\IPaymentTermsRepository;
use Kinderm8\Repositories\PaymentTerms\PaymentTermsRepository;
use Kinderm8\Repositories\ReportFieldSave\IReportFieldSaveRepository;
use Kinderm8\Repositories\ReportFieldSave\ReportFieldSaveRepository;
use Kinderm8\Repositories\Service\IServiceRepository;
use Kinderm8\Repositories\Service\ServiceRepository;
use Kinderm8\Repositories\Provider\ProviderRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;
use Kinderm8\Repositories\Immunisation\IImmunisationRepository;
use Kinderm8\Repositories\Immunisation\ImmunisationRepository;
use Kinderm8\Repositories\Supplier\ISupplierRepository;
use Kinderm8\Repositories\Supplier\SupplierRepository;
use Kinderm8\Repositories\Category\CategoryRepository;
use Kinderm8\Repositories\Category\ICategoryRepository;
use Kinderm8\Repositories\ParentPaymentProvider\IParentPaymentProviderRepository;
use Kinderm8\Repositories\ParentPaymentProvider\ParentPaymentProviderRepository;
use Kinderm8\Repositories\ParentPaymentSchedule\IParentPaymentScheduleRepository;
use Kinderm8\Repositories\ParentPaymentSchedule\ParentPaymentScheduleRepository;
use Kinderm8\Repositories\Receipt\ReceiptRepository;
use Kinderm8\Repositories\Receipt\IReceiptRepository;
use Kinderm8\Repositories\Reimbursements\IReimbursementsRepository;
use Kinderm8\Repositories\Reimbursements\ReimbursementsRepository;
use Kinderm8\Repositories\VisitorDetails\IVisitorDetailsRepository;
use Kinderm8\Repositories\VisitorDetails\VisitorDetailsRepository;
use Kinderm8\Repositories\StaffAttendance\IStaffAttendanceRepository;
use Kinderm8\Repositories\StaffAttendance\StaffAttendanceRepository;
use Kinderm8\Repositories\StaffIncident\IStaffIncidentRepository;
use Kinderm8\Repositories\StaffIncident\StaffIncidentRepository;

class RepositoriesServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {

    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind(IUserRepository::class, UserRepository::class);
        $this->app->bind(IOrganizationRepository::class, OrganizationRepository::class);
        $this->app->bind(IBranchRepository::class, BranchRepository::class);
        $this->app->bind(IPermissionRepository::class, PermissionRepository::class);
        $this->app->bind(IRoleRepository::class, RoleRepository::class);
        $this->app->bind(IInvitationRepository::class, InvitationRepository::class);
        $this->app->bind(IAttendanceRepository::class, AttendanceRepository::class);
        $this->app->bind(IFeeRepository::class, FeeRepository::class);
        $this->app->bind(IBookingRepository::class, BookingRepository::class);
        $this->app->bind(IChildRepository::class, ChildRepository::class);
        $this->app->bind(ICCSEnrolmentRepository::class, CCSEnrolmentRepository::class);
        $this->app->bind(ISessionSubmissionRepository::class, SessionSubmissionRepository::class);
        $this->app->bind(IRoomRepository::class, RoomRepository::class);
        $this->app->bind(IContactReportRepository::class, ContactReportRepository::class);
        $this->app->bind(IFinanceReportRepository::class, FinanceReportRepository::class);
        $this->app->bind(IAllergyTypesRepository::class, AllergyTypesRepository::class);
        $this->app->bind(IReportFieldSaveRepository::class, ReportFieldSaveRepository::class);
        $this->app->bind(ICCSEntitlementRepository::class, CCSEntitlementRepository::class);
        $this->app->bind(ICCSSetupRepository::class, CCSSetupRepository::class);
        $this->app->bind(IEducatorRatioRepository::class, EducatorRatioRepository::class);
        $this->app->bind(IEmergencyContactRepository::class, EmergencyContactRepository::class);
        $this->app->bind(IServiceRepository::class, ServiceRepository::class);
        $this->app->bind(IProviderRepository::class, ProviderRepository::class);
        $this->app->bind(IParentFinanceExclusionRepository::class, ParentFinanceExclusionRepository::class);
        $this->app->bind(IBookingRequestRepository::class, BookingRequestRepository::class);
        $this->app->bind(IBusListRepository::class, BusListRepository::class);
        $this->app->bind(ISchoolRepository::class, SchoolRepository::class);
        $this->app->bind(IImmunisationRepository::class, ImmunisationRepository::class);
        $this->app->bind(IPaymentTermsRepository::class, PaymentTermsRepository::class);
        $this->app->bind(ISupplierRepository::class, SupplierRepository::class);
        $this->app->bind(ICategoryRepository::class, CategoryRepository::class);
        $this->app->bind(IReceiptRepository::class, ReceiptRepository::class);
        $this->app->bind(IReimbursementsRepository::class, ReimbursementsRepository::class);
        $this->app->bind(IVisitorDetailsRepository::class, VisitorDetailsRepository::class);
        $this->app->bind(IParentPaymentProviderRepository::class, ParentPaymentProviderRepository::class);
        $this->app->bind(IStaffAttendanceRepository::class, StaffAttendanceRepository::class);
        $this->app->bind(IParentPaymentScheduleRepository::class, ParentPaymentScheduleRepository::class);
        $this->app->bind(IStaffIncidentRepository::class, StaffIncidentRepository::class);
    }
}
