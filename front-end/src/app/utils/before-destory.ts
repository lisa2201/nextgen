export interface BeforeOnDestroy {
    // tslint:disable-next-line: typedef
    ngxBeforeOnDestroy();
}

// tslint:disable-next-line: ban-types
type NgxInstance = BeforeOnDestroy & Object;
// tslint:disable-next-line: ban-types
type Descriptor = TypedPropertyDescriptor<Function>;
type Key = string | symbol;

export function BeforeOnDestroy(target: NgxInstance, key: Key, descriptor: Descriptor): any
{
    return {
        value: async ( ... args: any[]) =>
        {
            await target.ngxBeforeOnDestroy();
            
            return descriptor.value.apply(target, args);
        }
    }
}
