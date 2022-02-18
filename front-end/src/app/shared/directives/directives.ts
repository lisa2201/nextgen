import { NgModule } from '@angular/core';

import { AuthVisibilityCheckDirective } from './auth-visibility-check/auth-visibility-check.directive';
import { HasPermissionDirective } from './has-permission/has-permission.directive';
import { DebounceClickDirective } from './debounce-click/DebounceClick.directive';
import { HorizontalScrollDirective } from './HorizontalScrollMouseWheel/horizontal-scroll.directive';
import { ScrollEventDirective } from './scroll-event/scroll-event.directive';

@NgModule({
    declarations: [
        AuthVisibilityCheckDirective,
        HasPermissionDirective,
        DebounceClickDirective,
        HorizontalScrollDirective,
        ScrollEventDirective
    ],
    imports: [],
    exports: [
        AuthVisibilityCheckDirective,
        HasPermissionDirective,
        DebounceClickDirective,
        HorizontalScrollDirective,
        ScrollEventDirective
    ]
})
export class KM8DirectivesModule {
}
