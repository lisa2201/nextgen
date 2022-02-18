import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { ServerLogViewerService } from './services/server-log-viewer.service';
import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ServerLogViewerComponent } from './server-log-viewer.component';
import { ServerLogViewerListViewComponent } from './list-view/list-view.component';

const routes = [
    {
        path: '',
        component: ServerLogViewerComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N00',
            title: 'View Server Logs'
        }
    }
];

@NgModule({
    declarations: [
        ServerLogViewerComponent,
        ServerLogViewerListViewComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,
        KM8SharedModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        NzFormModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzTableModule,
        NzDatePickerModule
    ],
    providers: [
        ServerLogViewerService
    ]
})

export class ServerLogViewerModule { }
