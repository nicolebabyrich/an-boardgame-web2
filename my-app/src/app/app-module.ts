import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { NavbarComponent } from './navbar-component/navbar-component';
import { FooterComponent } from './footer-component/footer-component';
import { ChatbotComponent } from './chatbot-component/chatbot-component';
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

@NgModule({
  declarations: [
    App,
    NavbarComponent,
    FooterComponent,
    ChatbotComponent,
    HomeComponent,
    ProductListComponent,
    ProductDetailComponent,
    CartComponent,
    CheckoutComponent,
    CheckoutSuccessComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    AccountComponent,
    OrdersComponent,
    OrderDetailComponent,
    BlogComponent,
    AdminLoginComponent,
    AdminComponent,
    PageNotFoundComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    provideHttpClient()
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [App]
})
export class AppModule {}
