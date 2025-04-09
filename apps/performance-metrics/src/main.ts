import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { catchError, from, throwError } from 'rxjs';

// Store the subscription at module level for potential cleanup
// (though for Angular bootstrap it typically lives for the app's lifetime)
const appSubscription = from(bootstrapApplication(AppComponent, appConfig))
  .pipe(
    catchError(err => {
      console.error(err);
      return throwError(() => new Error(err));
    })
  )
  .subscribe();

