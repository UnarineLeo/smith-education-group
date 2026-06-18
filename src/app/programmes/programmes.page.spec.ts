import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Programmes } from './programmes.page';

describe('Programmes', () => {
  let component: Programmes;
  let fixture: ComponentFixture<Programmes>;
  beforeEach(async () => {
    fixture = TestBed.createComponent(Programmes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
