import {FormInputs} from './form-inputs';
import * as _ from 'lodash';

export class FormFieldsSettings {
    id: string;
    inputs: any;
    mandatory: boolean;
    code: string;
    name: string;

    constructor(formFieldsSettings?: any, index?: number) {
        this.id = formFieldsSettings.id;
        this.inputs = _.map(formFieldsSettings.inputs, (val: any, idx: number) => new FormInputs(val,formFieldsSettings.section_code));
        this.mandatory = formFieldsSettings.mandatory;
        this.code = formFieldsSettings.section_code;
        this.name = formFieldsSettings.title;
    }
}
