import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { PaymentMethodsService } from './payment-methods/services/payment-methods.service';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'payment-methods',
        pathMatch: 'full'
    },
    {
        path: 'payment-methods',
        loadChildren: () => import('./payment-methods/payment-methods.module').then(m => m.PaymentMethodsModule)
    },
    {
        path: 'invoices',
        loadChildren: () => import('./invoices/invoices.module').then(m => m.InvoicesModule),
    },
    {
        path: 'payment-startup',
        loadChildren: () => import('./payment-startup/payment-startup.module').then(m => m.PaymentStartupModule)
    },
    {
        path: 'payment-histories',
        loadChildren: () => import('./payment-histories/payment-histories.module').then(m => m.PaymentHistoriesModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];

@NgModule({
    declarations: [],
    imports: [
        RouterModule.forChild(routes)
    ],
    providers: [
        PaymentMethodsService // Used in payment-startup and payment methods modules
    ]
})

export class PaymentModule { }
