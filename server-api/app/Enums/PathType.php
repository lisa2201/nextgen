<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class PathType extends Enum
{
    const ROOT_DIR = 'root';
    const PROFILE_PATH = 'profile';
    const IMAGE_PATH = 'images';
    const VIDEO_PATH = 'videos';
    const AUDIO_PATH = 'audios';
    const DOC_PATH = 'documents';
    const OTHER_PATH = 'others';
}
