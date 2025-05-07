import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LlamadaEmergenciasPage } from './llamada-emergencias.page';

describe('LlamadaEmergenciasPage', () => {
  let component: LlamadaEmergenciasPage;
  let fixture: ComponentFixture<LlamadaEmergenciasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LlamadaEmergenciasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
