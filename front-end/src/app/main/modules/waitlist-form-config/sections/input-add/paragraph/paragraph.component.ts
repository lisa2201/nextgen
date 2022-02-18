import {Component, EventEmitter, Inject, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import * as DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';


@Component({
    selector: 'paragraph',
    templateUrl: './paragraph.component.html',
    styleUrls: ['./paragraph.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class ParagraphComponent implements OnInit {


    public Editor = DecoupledEditor;
    paragraphForm: FormGroup;
    title: string;
    buttonLoader: boolean;
    paragraphTemplate: string;

    public config = {
        toolbar: {
            items: [
                'heading',
                '|',
                'fontSize',
                'fontFamily',
                '|',
                'fontColor',
                'fontBackgroundColor',
                '|',
                'bold',
                // 'italic',
                'underline',
                'strikethrough',
                '|',
                'alignment',
                '|',
                'numberedList',
                'bulletedList',
                '|',
                'outdent',
                'indent',
                '|',
                // 'todoList',
                'link',
                // 'blockQuote',
                // 'insertTable',
                // 'mediaEmbed',
                '|',
                'undo',
                'redo'
            ],
            shouldNotGroupWhenFull: true,
        },
        link: {
            // Automatically add target="_blank" and rel="noopener noreferrer" to all external links.
            addTargetToExternalLinks: true,

            // Let the users control the "download" attribute of each link.
            // decorators: [
            //     {
            //         mode: 'manual',
            //         label: 'Downloadable',
            //         attributes: {
            //             download: 'download'
            //         }
            //     }
            // ]
        },
        language: 'en',
        shouldNotGroupWhenFull: true,
        placeholder: 'Type the content here!',
       /* link: {addTargetToExternalLinks: true}*/
    };

    @Output() paragraph: EventEmitter<any>;

    constructor(
        public matDialogRef: MatDialogRef<ParagraphComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _matDialog: MatDialog,
    ) {
        this.title = 'Add text';
        this.buttonLoader = false;
        this.paragraphForm = this.createInputForm();
        this.paragraph = new EventEmitter();

        this.paragraphTemplate = data.question;
        if (this.paragraphTemplate !== '') {
            this.title = 'Edit text';
        }
    }

    ngOnInit(): void {
    }

    onReady(editor) {
        editor.ui.getEditableElement().parentElement.insertBefore(
            editor.ui.view.toolbar.element,
            editor.ui.getEditableElement(),
            editor.editing.view.change(writer => {
                writer.setStyle('height', '300px', editor.editing.view.document.getRoot());
            }),
            editor.editing.view.change(writer => {
                writer.setStyle('width', '1000px', editor.editing.view.document.getRoot());
            })
        );
    }

    createInputForm(): FormGroup {
        return new FormGroup({
            paragraph: new FormControl('', [Validators.required]),
        });
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }
        setTimeout(() => this.paragraphForm.reset(), 20);
    }

    setValue(e): void {
        if (e) {
            e.preventDefault();
        }
        if (this.paragraphForm.invalid) {
            return;
        }
        this.buttonLoader = false;
        this.matDialogRef.close({event: 'Close', paragraph: this.fc.paragraph.value});
        // this.paragraph.next({value: this.fc.paragraph.value});

        // setTimeout(() => this.matDialogRef.close(), 250);
    }

    get fc(): any {
        return this.paragraphForm.controls;
    }
}
