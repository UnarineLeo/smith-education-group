import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ContactUsPage } from './contact-us.page';

describe('ContactUsPage enquiry submission', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([]), {
      provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ university: 'UCT', type: 'University Tutoring', about: 'Statistics' }) } }
    }] });
    const fixture = TestBed.createComponent(ContactUsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;
    Object.assign(page.enquiry, { name: 'Student', email: 'student@example.com', consent: true });
    const form = { invalid: false, resetForm: jasmine.createSpy('resetForm') } as unknown as NgForm;
    return { page, form, element: fixture.nativeElement.querySelector('form') as HTMLFormElement };
  }
  it('sends the prefilled university and clears the form only after acceptance', async () => {
    const { page, form, element } = await setup();
    const send = spyOn(window, 'fetch').and.resolveTo({ ok: true, json: async () => ({ success: true }) } as Response);
    await page.submitEnquiry(form, element);
    expect(JSON.parse(send.calls.mostRecent().args[1]!.body as string).university).toBe('University of Cape Town');
    expect(send.calls.mostRecent().args[0]).toBe('/api/contact.php');
    expect(form.resetForm).toHaveBeenCalled();
    expect(page.formStatus).toContain('submitted');
    expect(page.submitting).toBeFalse();
  });
  it('preserves the enquiry when delivery cannot be confirmed', async () => {
    const { page, form, element } = await setup();
    spyOn(window, 'fetch').and.resolveTo({ ok: false, json: async () => ({ success: false }) } as Response);
    await page.submitEnquiry(form, element);
    expect(form.resetForm).not.toHaveBeenCalled();
    expect(page.enquiry.message).toContain('Statistics');
    expect(page.formStatus).toContain('could not confirm');
    expect(page.submitting).toBeFalse();
  });
  it('does not send an invalid enquiry', async () => {
    const { page, element } = await setup();
    const send = spyOn(window, 'fetch');
    const mark = jasmine.createSpy();
    await page.submitEnquiry({ invalid: true, control: { markAllAsTouched: mark } } as unknown as NgForm, element);
    expect(mark).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
