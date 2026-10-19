import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ContactUsPage } from './contact-us.page';

describe('ContactUsPage', () => {
  it('prefills the university and preserves it when saving and restoring an enquiry', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), {
      provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ university: 'UCT', type: 'University Tutoring', about: 'Statistics' }) } }
    }] });
    const fixture = TestBed.createComponent(ContactUsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(page.enquiry.university).toBe('University of Cape Town');
    expect(page.enquiry.message).toContain('Statistics');
    const stored = JSON.stringify({ ...page.enquiry, name: 'Student', email: 'student@example.com', consent: true });
    spyOn(localStorage, 'getItem').and.returnValue(stored);
    page.enquiry.university = '';
    page.restoreDraft();
    expect(page.enquiry.university).toBe('University of Cape Town');
    fixture.detectChanges();
    await fixture.whenStable();
    const save = spyOn(localStorage, 'setItem');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(save).toHaveBeenCalledWith('smith-enquiry-draft', jasmine.stringMatching('University of Cape Town'));
  });
});
