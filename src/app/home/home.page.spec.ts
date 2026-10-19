import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home.page';

describe('HomePage', () => {
  it('renders the home sections and supplied student testimonial', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.home-hero')).not.toBeNull();
    expect(page.querySelector('.home-support')).not.toBeNull();
    expect(page.querySelector('.university-home')).not.toBeNull();
    expect(page.querySelector('.progress-carousel')?.textContent).toContain('Thabo M.');
    expect(page.querySelector('.contact-grid')).toBeNull();
  });
});
