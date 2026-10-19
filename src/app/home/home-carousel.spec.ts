import { TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { provideRouter } from '@angular/router';

describe('HomePage', () => {
  it('changes the visible quote and attribution, wrapping in both directions', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Thabo M.');
    (element.querySelector('[aria-label="Previous testimonial"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Amanda N.');
    expect(element.querySelector('blockquote')?.textContent).toContain('Taxation can be overwhelming');
    (element.querySelector('[aria-label="Next testimonial"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Thabo M.');
    (element.querySelector('[aria-label="Show testimonial from Naledi K."]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('blockquote')?.textContent).toContain('databases, SQL and systems analysis');
  });
});
