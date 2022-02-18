export class FormInputs {
    name: string;
    types: any;
    height: string;
    question: string;
    required: boolean;
    input_type: string;
    placeholder: string;
    section: string;
    waitlist_section: string;

    constructor(formInputs?: any, section?: string, index?: number) {
        this.name = formInputs.input_name;
        this.types = formInputs.types;
        this.height = formInputs.column_height;
        this.question = formInputs.question;
        this.required = formInputs.input_mandatory;
        this.input_type = formInputs.input_type;
        this.placeholder = formInputs.input_placeholder;
        this.section = section;
        this.waitlist_section = section;
    }
}
