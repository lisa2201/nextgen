import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { Invitation } from '../../invitation/invitation.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { BranchService } from '../../branch/services/branch.service';
import { AuthService } from 'app/shared/service/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Branch } from '../../branch/branch.model';
import * as _ from 'lodash';
import { takeUntil, map, finalize, shareReplay } from 'rxjs/operators';
import { AppConst } from 'app/shared/AppConst';
import { AlternativePayment } from '../alternative-payment.model';
import { SortProp } from 'app/shared/interface/sort';

@Injectable({
  providedIn: 'root'
})
export class DebtService {

  private _unsubscribeAll: Subject<any>;

  private alternativePaymentData: AlternativePayment[];

  onDebtListChanged: BehaviorSubject<any>;
  onDebtSearchTextChanged: Subject<any>;
  onDebtFilterChanged: Subject<any>;

  onAlternativePaymentChanged: BehaviorSubject<any>;
  onFilterBranchesChanged: BehaviorSubject<any>;

  onPaginationChanged: Subject<PaginationProp>;
  onSearchTextChanged: Subject<any>;
  onSortChanged: Subject<SortProp>;
  onTableLoaderChanged: Subject<any>;
  onFilterChanged: Subject<any>;

  defaultPageIndex: any = 1;
  defaultPageSize: any = 5;
  defaultPageSizeOptions: number[] = [5, 10, 20];

  totalRecords: number;
  totalDisplayRecords: number;
  isFiltered: boolean;
  pagination: any | null = null;
  filterBy: any | null = null;
  sortBy: any | null = null;
  searchText: string | null = null;
  DebtApiData: any;
  ApiData: any;

  /**
   * Constructor
   *
   * @param {HttpClient} _httpClient
   * @param {NGXLogger} _logger
   * @param {BranchService} _branchService
   * @param {AuthService} _authService
   */
  constructor(
    private _httpClient: HttpClient,
    private _logger: NGXLogger,
    private _branchService: BranchService,
    private _authService: AuthService
  ) {
    // Set the defaults
    this.totalRecords = 0;
    this.totalDisplayRecords = 0;
    this.isFiltered = false;

    this.onDebtListChanged = new BehaviorSubject([]);
    this.onDebtSearchTextChanged = new Subject();
    this.onDebtFilterChanged = new Subject();

    this.onAlternativePaymentChanged = new BehaviorSubject([]);
    this.onFilterBranchesChanged = new BehaviorSubject([]);

    this.onSearchTextChanged = new Subject();
    this.onSortChanged = new Subject();
    this.onPaginationChanged = new Subject();
    this.onTableLoaderChanged = new Subject();
    this.onFilterChanged = new Subject();

    this._unsubscribeAll = new Subject();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Resolver
   *
   * @param {ActivatedRouteSnapshot} route
   * @param {RouterStateSnapshot} state
   * @returns {Observable<any> | Promise<any> | any}
   */
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {
    return new Promise((resolve, reject) => {
      
      this.setEvents();

      resolve(null);
      // Promise.all([
      //   this.getBranches(),
      // ])
      //   .then(([branches]: [any]) => {
      //     this.setEvents(branches);

      //     resolve(null);
      //   })
      //   .catch(error => {
      //     reject(error);
      //   });
  
    });
  }

  /**
   * set events after resolve
   */
  setEvents(branches: Branch[] = []): void {

    if (!_.isEmpty(branches)) {
      this.onFilterBranchesChanged.next(branches);
    }

    // Alternative Payment Tab

    this.onSearchTextChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(searchText => {
        this.searchText = searchText;

        this.getAlternativePayments();
      });

    this.onFilterChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(filter => {
        this.filterBy = filter;
        this.getAlternativePayments();
      });

    this.onPaginationChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(pagination => {
        this.pagination = pagination;

      });

      // Debt Tab

    this.onDebtSearchTextChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(searchText => {
        this.searchText = searchText;

        this.getDebtList();
      });

    this.onDebtFilterChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(filter => {
        this.filterBy = filter;

        this.getDebtList();
      });
  }

  /**
   * get branch list by user
   *
   * @returns {Promise<any>}
   */
  getBranches(): Promise<any> {
    return new Promise((resolve, reject) => {
      this._branchService
        .getBranchesByUser()
        .pipe(
          map(response => !_.isEmpty(response) ? response.map((i: any, idx: number) => new Branch(i, idx)) : [])
        )
        .subscribe((response: any) => {
          resolve(response);
        },
          reject
        );
    });
  }

  getAlternativePayments(): Promise<any> {

    return new Promise((resolve, reject) => {
      // set table loader
      this.onTableLoaderChanged.next(true);

      if (_.isNull(this.pagination)) {
        // set default value
        this.pagination = {
          page: this.defaultPageIndex,
          size: this.defaultPageSize
        };
      }

      const params = new HttpParams()
        .set('page', this.pagination.page)
        .set('offset', this.pagination.size)
        .set('search', this.searchText)
        .set('filters', JSON.stringify(this.filterBy));

      return this._httpClient
        .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-alternatve-payments`, { params })
        .pipe(
          map((response) => {
            this.alternativePaymentData = response.data.map((i: any) => new AlternativePayment(i));

            this.ApiData = response.ApiData;

            return {
              items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.alternativePaymentData],
              apiData: this.ApiData,
            };

          }),
          finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
          shareReplay()
        )
        .subscribe(
          (response: any) => {
            this.onAlternativePaymentChanged.next(response);

            resolve();
          },
          reject
        );
    });
  }

  getDebtList(): Promise<any> {

    return new Promise((resolve, reject) => {
      // set table loader
      this.onTableLoaderChanged.next(true);

      if (_.isNull(this.pagination)) {
        // set default value
        this.pagination = {
          page: this.defaultPageIndex,
          size: this.defaultPageSize
        };
      }

      const params = new HttpParams()
        .set('page', this.pagination.page)
        .set('offset', this.pagination.size)
        .set('search', this.searchText)
        .set('filters', JSON.stringify(this.filterBy));

      return this._httpClient
        .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-debt-list`, { params })
        .pipe(
          map((response) => {

            this.DebtApiData = response.data;

            return {
              items: this.DebtApiData
            };

          }),
          finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
          shareReplay()
        )
        .subscribe(
          (response: any) => {
            this.onDebtListChanged.next(response);

            resolve();
          },
          reject
        );
    });
  }



  createAlternativePayment(postData: any): Observable<any> {

    return this._httpClient
      .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-altrenative-payment`, postData)
      .pipe(
        map((response) => {
          this.getAlternativePayments();
          return response.message;
        })
      );
  }

  updateAlternativePayment(postData: any): Observable<any> {

    return this._httpClient
      .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit-altrenative-payment`, postData)
      .pipe(
        map((response) => {
          this.getAlternativePayments();
          return response.message;
        })
      );

  }

  updloadSupportingDoc(postData: any): Observable<any> {

    return this._httpClient
      .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/upload-altrenative-payment-doc`, postData)
      .pipe(
        map((response) => {
          this.getAlternativePayments();
          return response.message;
        })
      );

  }

  unsubscribeOptions(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this._unsubscribeAll = new Subject();
  }
}