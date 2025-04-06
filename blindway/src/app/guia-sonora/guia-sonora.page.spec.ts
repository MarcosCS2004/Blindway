import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuiaSonoraPage } from './guia-sonora.page';

describe('GuiaSonoraPage', () => {
  let component: GuiaSonoraPage;
  let fixture: ComponentFixture<GuiaSonoraPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GuiaSonoraPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
