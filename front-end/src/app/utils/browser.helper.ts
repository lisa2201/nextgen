
export class BrowserHelper
{
    public static getLocalStorageStatus(): string
    {
        const test = '__storage_test__';

        try 
        {
            // try setting an item
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
        }
        catch (e)
        {   
            // browser specific checks if local storage was exceeded
            if (e.name === 'QUATA_EXCEEDED_ERR' // Chrome
                || e.name === 'NS_ERROR_DOM_QUATA_REACHED' // Firefox/Safari
            ) 
            {
                // local storage is full
                return 'full';
            } 
            else 
            {
                try
                {
                    if (localStorage.remainingSpace === 0) // IE
                    {
                        // local storage is full
                        return 'full';
                    }
                }
                catch (e) 
                {
                    // localStorage.remainingSpace doesn't exist
                }
    
                // local storage might not be available
                return 'unavailable';
            }
        } 

        return 'available';
    }

    public static storageAvailable(type: string): boolean 
    {
        try 
        {
            // tslint:disable-next-line: one-variable-per-declaration
            const storage = window[type], x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) 
        {
            return false;
        }
    }
}
