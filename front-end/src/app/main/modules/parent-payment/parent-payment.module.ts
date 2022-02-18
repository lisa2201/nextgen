import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'providers',
        pathMatch: 'full'
    },
    {
        path: 'providers',
        loadChildren: () => import('./parent-payment-providers/parent-payment-providers.module').then(m => m.ParentPaymentProvidersModule)
    }
];

@NgModule({
    declarations: [],
    imports: [
        RouterModule.forChild(routes)
    ]
})
export class ParentPaymentModule { }
