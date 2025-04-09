import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NxWelcomeComponent } from './nx-welcome.component';
import { RouterModule } from '@angular/router';
import { of, Subscription } from 'rxjs';

describe('AppComponent', () => {
  // Use proper type instead of any
  let subscription: Subscription;

  beforeEach(() => {
    const testBedConfig$ = of(
      TestBed.configureTestingModule({
        imports: [AppComponent, NxWelcomeComponent, RouterModule.forRoot([])],
      })
    );

    // Store the subscription for cleanup
    subscription = testBedConfig$.subscribe(() => TestBed.compileComponents());
  });

  afterEach(() => {
    // Make sure to unsubscribe to avoid memory leaks
    subscription.unsubscribe();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Welcome performance-metrics'
    );
  });

  it(`should have as title 'performance-metrics'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('performance-metrics');
  });
});
