import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { StoreApiService } from './services/store-api.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isStandaloneAdmin = false;

  constructor(
    public store: StoreApiService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url.split('?')[0];
        this.isStandaloneAdmin = url === '/admin';
        document.body.dataset['page'] = url === '/' || url === '/home' ? 'home' : url.replace(/^\//, '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  skipToMain(): void {
    const main = document.querySelector('#main-content') as HTMLElement | null;
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
    }
  }

  onModalContentClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement)?.closest('[data-action]') as HTMLElement | null;
    if (!target) return;
    const action = target.dataset['action'];
    if (action === 'open-3d-model') {
      const title = target.dataset['modelTitle'] || 'Mô hình 3D';
      const src = target.dataset['modelSrc'] || '';
      const poster = target.dataset['modelPoster'] || '';
      this.store.open3DModelModal(title, src, poster);
    } else if (action === 'close-info-modal') {
      event.preventDefault();
      const href = target.getAttribute('href') || target.dataset['route'];
      this.store.closeInfoModal();
      if (href) {
        this.router.navigateByUrl(href);
      }
    }
  }
}
