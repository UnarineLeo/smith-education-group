import { By } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular/standalone';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TutorsPage } from './tutors.page';

describe('Tutor biography controls', () => {
  it('expands and collapses the same biography on repeated clicks without affecting other tutors', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TutorsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.biography-toggle');
    const panel = element.querySelector<HTMLElement>('#tutor-biography-0')!;
    expect(element.querySelector('.tutor-info h3')?.textContent).toBe('Kwanda Camane');
    expect(panel.hidden).toBeTrue();
    for (let i = 0; i < 2; i++) {
      buttons[0].click();
      fixture.detectChanges();
      expect(panel.hidden).toBeFalse();
      expect(buttons[0].textContent).toContain('Read less');
      expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
      expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
      buttons[0].click();
      fixture.detectChanges();
      expect(panel.hidden).toBeTrue();
      expect(buttons[0].textContent).toContain('Read more');
      expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    }
  });
  it('returns to the hero on page entry and includes Simile with Kwanda first', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TutorsPage);
    fixture.detectChanges();
    const content = fixture.debugElement.query(By.directive(IonContent)).componentInstance as IonContent;
    const scroll = spyOn(content, 'scrollToTop').and.resolveTo();
    fixture.componentInstance.ionViewDidEnter();
    expect(scroll).toHaveBeenCalledWith(0);
    const names = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tutor-info h3')).map(el => el.textContent);
    expect(names[0]).toBe('Kwanda Camane');
    expect(names).toContain('Simile Fakazi');
    expect(names.length).toBe(8);
  });

});
