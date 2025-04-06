import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuiaVisualPage } from './guia-visual.page';

describe('GuiaVisualPage', () => {
  let component: GuiaVisualPage;
  let fixture: ComponentFixture<GuiaVisualPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GuiaVisualPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
