import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {ChildrenService} from '../../services/children.service';
import {first, map} from 'rxjs/operators';
import {Child} from '../../child.model';
import {AppConst} from 'app/shared/AppConst';

@Injectable()

export class ChildConsentsService {

    private _unsubscribeAll: Subject<any>;
    private child: Child;
    childId: string;
    routeParams: any;
    onChildChanged: BehaviorSubject<any>;

    constructor(
        private _httpClient: HttpClient,
        private _router: Router,
        private _childrenService: ChildrenService,
    ) {
        this._unsubscribeAll = new Subject();
        this.onChildChanged = new BehaviorSubject([]);
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
                // this.getDocuments(this.routeParams.id),
                this.getChild(this.routeParams.id),

            ])
                .then(response => {
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });

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

    storeConsents(postData: any): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-consent`, postData)
            .pipe(
                map((response) => {
                    // this.getMedical(postData['childId'])
                    this.getChild(this.childId);
                    return response.message;

                })
            );
    }
}
