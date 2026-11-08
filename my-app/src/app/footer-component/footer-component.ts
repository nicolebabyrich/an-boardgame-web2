import { Component } from '@angular/core';
import { StoreApiService } from '../services/store-api.service';

@Component({
  selector: 'app-footer-component',
  standalone: false,
  templateUrl: './footer-component.html',
  styleUrl: './footer-component.css'
})
export class FooterComponent {
  constructor(public store: StoreApiService) {}

  openPolicy(type: 'privacy' | 'shipping' | 'return'): void {
    this.store.openPolicyModal(type);
  }
}
