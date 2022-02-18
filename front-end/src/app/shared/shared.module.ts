import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NgPipesModule } from 'ngx-pipes';

import { KM8PipesModule } from './pipes/pipe.module';
import { KM8DirectivesModule } from './directives/directives';

import { FuseDirectivesModule } from '@fuse/directives/directives';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzRadioModule } from 'ng-zorro-antd/radio';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        FormsModule,
        FuseDirectivesModule,
        FlexLayoutModule,
        
        NgPipesModule,
        KM8PipesModule,
        KM8DirectivesModule,
        
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        NzButtonModule,
        NzSliderModule,
        NzRadioModule
    ],
    exports: [
        NgPipesModule,
        KM8PipesModule,
        KM8DirectivesModule
    ]
})
export class KM8SharedModule
{
    
}
