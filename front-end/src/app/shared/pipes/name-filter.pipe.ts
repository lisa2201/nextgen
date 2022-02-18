import { Pipe, PipeTransform } from '@angular/core';
import { User } from 'app/main/modules/user/user.model';

@Pipe({
    name: 'userNameFilter'
})
export class UserNameFilterPipe implements PipeTransform {

    transform(items: User[], searchText: string): any[] {
        
        if (!items) {
            return [];
        }
        if (!searchText) {
            return items;
        }
        searchText = searchText.toLocaleLowerCase();

        return items.filter(it => {
            return it.getFullName().toLocaleLowerCase().includes(searchText) || it.email.toLocaleLowerCase().includes(searchText);
        });
    }
}
