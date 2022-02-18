
import { DoWork, ObservableWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { delay, map } from 'rxjs/operators';

@ObservableWorker()
export class SubscriberBranchAccessWorker implements DoWork<any, any> 
{
    public work(input$: Observable<any>): Observable<any> 
    {
        return input$.pipe(
            delay(200),
            map(message => 
            {
                console.log(message); // outputs 'Hello from main thread'

                return `Hello from webworker`;
            }),
        );
    }
}