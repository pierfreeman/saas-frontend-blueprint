import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrgSettingsLayoutComponent } from './org-settings-layout.component';

describe('OrgSettingsLayoutComponent', () => {
  let fixture: ComponentFixture<OrgSettingsLayoutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrgSettingsLayoutComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(OrgSettingsLayoutComponent);
    fixture.detectChanges();
  });

  it('renders the Organisation Settings heading', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Organisation Settings');
  });

  it('renders navigation links', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Organization');
    expect(el.textContent).toContain('Members');
    expect(el.textContent).toContain('Billing');
    expect(el.textContent).toContain('Activity Log');
  });
});
