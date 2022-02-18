import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, Resolve } from '@angular/router';
import { Observable, forkJoin, Subject, BehaviorSubject } from 'rxjs';
import { browserRefresh } from 'app/app.component';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { map, shareReplay, takeUntil, finalize, first } from 'rxjs/operators';
import { Child } from '../../child.model';
import { ChildrenService } from '../../services/children.service';
import { ReturnFeeReduction } from '../return-fee-reduction.model';


@Injectable()
export class ReturnFeeReductionService implements Resolve<any> {

  private _unsubscribeAll: Subject<any>;

  private child: Child;
  private returnFeeData: ReturnFeeReduction[];

  onChildChanged: BehaviorSubject<any>;
  onPaginationChanged: Subject<any>;
  onTableLoaderChanged: Subject<any>;
  onSearchTextChanged: Subject<any>;

  onFeeChanged: BehaviorSubject<any>;
  routeParams: any;

  childId: string;
  defaultPageIndex: any;
  defaultPageSize: any;
  defaultPageSizeOptions: number[];

  ApiData: any;
  totalDisplayRecords: number;
  pagination: any | null = null;
  searchText: any;

  constructor(
    private _httpClient: HttpClient,
    private _router: Router,
    private _childrenService: ChildrenService,

  ) {
    this.onPaginationChanged = new Subject();
    this.onTableLoaderChanged = new Subject();
    this.onSearchTextChanged = new Subject();
    this._unsubscribeAll = new Subject();

    this.onFeeChanged = new BehaviorSubject([]);
    this.onChildChanged = new BehaviorSubject([]);

    this.searchText = null;
    this.defaultPageIndex = 1;
    this.defaultPageSize = 5;
    this.defaultPageSizeOptions = [5, 10, 20];

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
    this.routeParams = route.params;
    this.childId = route.params.id;
    return new Promise((resolve, reject) => {
      Promise.all([
        this.getChild(this.routeParams.id),
        this.getReturnFees(this.routeParams.id)

      ])
        .then(([fees, child]: [any, any]) => {
          this.setEvents();

          resolve();
        })
        .catch(error => {
          reject(error);
        });

    });
    return '';
  }

  setEvents() {

      this.onPaginationChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(pagination => {
              this.pagination = pagination
              this.getReturnFees(this.childId);
          });

      this.onSearchTextChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(searchText => {
              this.searchText = searchText;
              this.getReturnFees(this.childId);
          });

  }

  getReturnFees(index: any): Promise<any> {

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
        .set('child_id', index)
        .set('page', this.pagination.page)
        .set('offset', this.pagination.size)
        .set('search', this.searchText);

      return this._httpClient
        .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-return-fee-data`, { params })
        .pipe(
          map((response) => {
            this.returnFeeData = response.data.map((i: any) => new ReturnFeeReduction(i));

            this.ApiData = response.ApiData;

            return {
              items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.returnFeeData],
              apiData: this.ApiData,
            };

          }),
          finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
          shareReplay()
        )
        .subscribe(
          (response: any) => {
            this.onFeeChanged.next(response);

            resolve();
          },
          reject
        );
    });
  }

  /**
   * Get child item
   * 
   * @returns {Promise<any>}
   */
  getChild(index: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this._childrenService
        .getChild(index)
        .pipe(first())
        .subscribe(
          (response) => {
            this.child = response;

            this.onChildChanged.next(this.child);

            resolve();
          },
          reject
        );
    });
  }

  storeReturnFee(postData: any): Observable<any> {

    return this._httpClient
      .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-return-fee-reduction`, postData)
      .pipe(
        map((response) => {
          this.getReturnFees(this.childId)
          return response;
        })
      );
  }

  updateReturnFee(postData: any): Observable<any> {

      return this._httpClient
          .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-return-fee-reduction`, postData)
          .pipe(
              map((response) => {
                  this.getReturnFees(this.childId)
                  return response.message;
              })
          );
  }

  cancelRturnFee(postData: any): Observable<any> {

      return this._httpClient
          .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/cancel-return-fee`, postData)
          .pipe(
              map(response =>{
                this.getReturnFees(this.childId)
                return response.message;
              }),
              shareReplay()
          );
  }

}
