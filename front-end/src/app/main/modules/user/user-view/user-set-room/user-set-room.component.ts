import { Component, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Room } from 'app/main/modules/room/models/room.model';
import { NzModalRef } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'user-set-room',
  templateUrl: './user-set-room.component.html',
  styleUrls: ['./user-set-room.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 300 }),
      fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class UserSetRoomComponent implements OnInit {
    // Private
    private _unsubscribeAll: Subject<any>;

    UserSetRoomForm: FormGroup;
    buttonLoader: boolean;
    searchProperties: string[] = [
        'title',
    ];

    @Input() rooms: Room[];

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalRef} _modal
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    )
    {
        // set default values
        this.buttonLoader = false;
        this.UserSetRoomForm = this.createForm();
        
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child set room modal !!!');

        if (this.rooms.length < 1)
        {
            this.UserSetRoomForm.disable();
        }
        else
        {
            this.onChanges();
        }
    }

    onChanges(): void
    {
        // Subscribe to search input changes
        this.UserSetRoomForm
            .get('search')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateListScroll());
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    createForm(): FormGroup
    {
        return new FormGroup({
            room: new FormControl(null, [Validators.required]),
            search: new FormControl(''),
        });
    }

    clear(e: MouseEvent): void
    {
        e.preventDefault();

        this.fc.search.patchValue('', { emitEvent: false });
    }

    updateListScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    getSelectedRoom(): any
    {
        return (this.UserSetRoomForm.valid) ? this.rooms.find(i => i.id === this.fc.room.value) : null;
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }

    get fc(): any 
    { 
        return this.UserSetRoomForm.controls; 
    }

}
