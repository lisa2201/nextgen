<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class FileType extends Enum
{
    const MIME_IMAGE = "image";
    const MIME_AUDIO = "audio";
    const MIME_OTHERS = [
        'application/x-zip-compressed',
        'application/zip',
        'application/x-bzip',
        'application/epub+zip',
        'application/font',
        'application/x-rar-compressed',
        'application/x-font-ttf'
    ];
    const MIME_VIDEO = "video";

    //URL
    const URL_MIME_YOUTUBE = "youtube";
    const URL_MIME_VIMEO = "vimeo";

    const PROFILE = 'profile';
    const IMAGE = 'image';
    const VIDEO = 'video';
    const REC_VIDEO = 'rec_video';
    const AUDIO = 'audio';
    const REC_AUDIO = 'rec_audio';
    const DOC = 'document';
    const OTHER = 'others';
}
