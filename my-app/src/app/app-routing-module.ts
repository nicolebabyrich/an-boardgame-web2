import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home-component/home-component';
import { ProductListComponent } from './product-list-component/product-list-component';
import { ProductDetailComponent } from './product-detail-component/product-detail-component';
import { CartComponent } from './cart-component/cart-component';
import { CheckoutComponent } from './checkout-component/checkout-component';
import { CheckoutSuccessComponent } from './checkout-success-component/checkout-success-component';
import { LoginComponent } from './login-component/login-component';
import { RegisterComponent } from './register-component/register-component';
import { ForgotPasswordComponent } from './forgot-password-component/forgot-password-component';
import { AccountComponent } from './account-component/account-component';
import { OrdersComponent } from './orders-component/orders-component';
import { OrderDetailComponent } from './order-detail-component/order-detail-component';
import { BlogComponent } from './blog-component/blog-component';
import { AdminLoginComponent } from './admin-login-component/admin-login-component';
import { AdminComponent } from './admin-component/admin-component';
import { PageNotFoundComponent } from './page-not-found-component/page-not-found-component';
import { adminAuthGuard, customerAuthGuard } from './classes/auth.guard';

const routes: Routes = [
  { path: '', component: HomeComponent, data: { section: 'story' } },
  { path: 'home', component: HomeComponent, data: { section: 'story' } },
  { path: 'story', component: HomeComponent, data: { section: 'story' } },
  { path: 'simulation', component: HomeComponent, data: { section: 'simulation' } },
  { path: 'characters', component: HomeComponent, data: { section: 'characters' } },
  { path: 'guide', component: HomeComponent, data: { section: 'guide' } },
  { path: 'products', component: ProductListComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'checkout-success', component: CheckoutSuccessComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'account', component: AccountComponent },
  { path: 'addresses', component: AccountComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'orders/:id', component: OrderDetailComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminAuthGuard] },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
