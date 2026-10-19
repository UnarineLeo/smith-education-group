import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('scrolls only the visible page when its menu item is selected again', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'isActive').and.returnValue(true);
    const visible = document.createElement('div');
    const hidden = document.createElement('div');
    hidden.className = 'ion-page-hidden';
    const visibleContent = document.createElement('ion-content');
    const hiddenContent = document.createElement('ion-content');
    const scrollVisible = jasmine.createSpy('visible scroll').and.resolveTo();
    const scrollHidden = jasmine.createSpy('hidden scroll').and.resolveTo();
    Object.defineProperty(visibleContent, 'scrollToTop', { value: scrollVisible });
    Object.defineProperty(hiddenContent, 'scrollToTop', { value: scrollHidden });
    visible.append(visibleContent);
    hidden.append(hiddenContent);
    fixture.nativeElement.append(visible, hidden);
    component.menuOpen = true;
    component.selectMenuPage('/tabs/tutors', new MouseEvent('click'));
    expect(scrollVisible).toHaveBeenCalledWith(0);
    expect(scrollHidden).not.toHaveBeenCalled();
    expect(component.menuOpen).toBeFalse();
  });

});
