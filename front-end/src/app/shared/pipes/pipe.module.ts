import { NgModule } from '@angular/core';

import { SafeUrlPipe } from './safe-url.pipe';
import { DefaultPipe } from './default-value.pipe';
import { FileSizePipe } from './file-size.pipe';
import { ReplaceStringPipe } from './replace.pipe';
import { SafeUrlPipes } from './safeurl.pipe';
import { ConvertNumberToTimeStringPipe } from './convert-number-to-12-hours.pipe';
import { FormatMomentParseDatePipe } from './format-parse-moment-date.pipe';
import { ConvertString24To12TimeStringPipe } from './convert-24-string-to-12-hours.pipe';
import { SetGlobalDateFormatPipe } from './set-global-date-format.pipe';
import { S3LinkPipe } from './s3-link.pipe';
import { UserNameFilterPipe } from './name-filter.pipe';
import { EscapeHtmlPipe } from './keep-html.pipe';

@NgModule({
    declarations: [
        SafeUrlPipe,
        DefaultPipe,
        FileSizePipe,
        ReplaceStringPipe,
        SafeUrlPipes,
        ConvertNumberToTimeStringPipe,
        FormatMomentParseDatePipe,
        ConvertString24To12TimeStringPipe,
        SetGlobalDateFormatPipe,
        S3LinkPipe,
        UserNameFilterPipe,
        EscapeHtmlPipe
    ],
    imports: [],
    exports: [
        SafeUrlPipe,
        DefaultPipe,
        FileSizePipe,
        ReplaceStringPipe,
        SafeUrlPipes,
        ConvertNumberToTimeStringPipe,
        FormatMomentParseDatePipe,
        ConvertString24To12TimeStringPipe,
        SetGlobalDateFormatPipe,
        S3LinkPipe,
        UserNameFilterPipe,
        EscapeHtmlPipe
    ]
})
export class KM8PipesModule {
}
