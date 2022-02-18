import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {Router} from '@angular/router';
import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {Subject} from 'rxjs';
import * as _ from 'lodash';
import {CommonService} from 'app/shared/service/common.service';
import {Child} from '../child.model';
import {takeUntil} from 'rxjs/operators';
import {ChildConsentsService} from './services/child-consents.service';
import {NGXLogger} from 'ngx-logger';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';

@Component({
    selector: 'child-consents',
    templateUrl: './child-consents.component.html',
    styleUrls: ['./child-consents.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ChildConsentsComponent implements OnInit {
    private _unsubscribeAll: Subject<any>;
    child: Child;
    consentsForm: FormGroup
    consents: any
    buttonLoader: boolean = false;
    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    panelOpenState: boolean = false;

    constructor(
        private _router: Router,
        private _commonService: CommonService,
        private _childConsentsService: ChildConsentsService,
        private _logger: NGXLogger,
        private _formBuilder: FormBuilder,
        private _notification: NotificationService,
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.consents = [];
    }

    ngOnInit(): void {

        this._childConsentsService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => {
                this._logger.debug('[child consents - child]', child);
                this.child = child;
                this.consents = child.consents;
                this.createForm();
            });
    }

    /**
     * Create health consents form
     *
     * @returns {FormGroup}
     */
    createForm(): void {
        this.consentsForm = this._formBuilder.group({});
        this.consents.forEach(x => {
            this.consentsForm.addControl(x.id, new FormControl(x.answer, null))
        })
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }


    getChildProfileImage(item): string {
        if (item.image)
            return this._commonService.getS3FullLink(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }

    changeConsentVal(consentId, e): void {
        this.consents[this.consents.findIndex(x => x.id === consentId)].answer = e;
    }

    onFormSubmit(e): void {
        e.preventDefault();

        this.buttonLoader = true;
        const obj = [];
        this.consents.forEach(x => {
            obj.push({
                consent_id: x.id,
                answer: x.answer
            })
        })

        this._childConsentsService.storeConsents({'consents': obj})
            .pipe()
            .subscribe(
                message => {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },
            );
    }
}
