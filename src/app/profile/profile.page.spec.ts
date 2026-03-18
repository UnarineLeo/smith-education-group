import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePage } from './profile.page';
import { AuthService } from '../services/auth.service';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  const authServiceMock = {
    getUser: jasmine.createSpy('getUser').and.resolveTo({ subjects: [] }),
    updateUser: jasmine.createSpy('updateUser').and.resolveTo(),
    presentToast: jasmine.createSpy('presentToast').and.resolveTo()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
