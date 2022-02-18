import { AppConst } from 'app/shared/AppConst';

// import * as mime from 'mime-types';

export class FileHelper 
{
    public static convertImgToDataURLviaCanvas(url: string, callback: CallableFunction, outputFormat: string): any
    {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () =>
        {
            let canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let dataURL: string;

            canvas.height = img.height;
            canvas.width = img.width;

            ctx.drawImage(img, 0, 0);
            dataURL = canvas.toDataURL(outputFormat);
            callback(dataURL);
            canvas = null;
        };

        img.src = url;
    }

    public static convertFileToDataUrlViaFileReader(url: string, callback: CallableFunction): any
    {
        const xhr = new XMLHttpRequest();
        xhr.onload = () =>
        {
            const reader = new FileReader();
            reader.onloadend = () =>
            {
                callback(reader.result);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    }

    public static b64toBlob(b64Data: string, contentType: string, sliceSize: number): Blob
    {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    // public static dataURLtoFile(dataUrl: string, filename: string): File
    // {
    //     const arr = dataUrl.split(','); 
    //     // tslint:disable-next-line: no-shadowed-variable
    //     const mime = arr[0].match(/:(.*?);/)[1];
    //     const bstr = atob(arr[1]); 
    //     let n = bstr.length; 
    //     const u8arr = new Uint8Array(n);
    //     while (n--) {
    //         u8arr[n] = bstr.charCodeAt(n);
    //     }
    //     return new File([u8arr], filename, { type: mime });
    // }

    public static cleanB64Object(base64Img: string): object
    {
        // Split the base64 string in data and contentType
        const block = base64Img.split(';');

        // Get the content type
        const contentType = block[0].split(':')[1]; // In this case "image/gif"

        // get the real base64 content of the file
        const realData = block[1].split(',')[1]; // In this case "iVBORw0KGg...."

        return {
            contentType: contentType,
            realData: realData
        };
    }
    
    // tslint:disable
    public static base64ArrayBuffer(arrayBuffer: any): string
    {
        let base64 = '';
        const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        const bytes = new Uint8Array(arrayBuffer);
        const byteLength = bytes.byteLength;
        const byteRemainder = byteLength % 3;
        const mainLength = byteLength - byteRemainder;

        let a, b, c, d;
        let chunk;

        // Main loop deals with bytes in chunks of 3
        for (let i = 0; i < mainLength; i = i + 3) {
            // Combine the three bytes into a single integer
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

            // Use bit masks to extract 6-bit segments from the triplet
            a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
            b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
            c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
            d = chunk & 63; // 63       = 2^6 - 1

            // Convert the raw binary segments to the appropriate ASCII encoding
            base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
        }

        // Deal with the remaining bytes and padding
        if (byteRemainder === 1) {
            chunk = bytes[mainLength];

            a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

            // Set the 4 least significant bits to zero
            b = (chunk & 3) << 4; // 3   = 2^2 - 1

            base64 += encodings[a] + encodings[b] + '==';
        } else if (byteRemainder === 2) {
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

            a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
            b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

            // Set the 2 least significant bits to zero
            c = (chunk & 15) << 2; // 15    = 2^4 - 1

            base64 += encodings[a] + encodings[b] + encodings[c] + '=';
        }

        return base64;
    }
    // tslint:enable

    public static dataURItoBlob(dataURI: string, callback: CallableFunction): Blob
    {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        const byteString = atob(dataURI.split(',')[1]);

        // separate out the mime component
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to an ArrayBuffer
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // write the ArrayBuffer to a blob, and you're done
        const bb = new Blob([ab], {
            type: mimeString
        });
        return bb;
    }

    // public static getFileExtByType(value: string): any
    // {
    //     return mime.lookup(value);
    // }

    public static sanitizeFileName(value: string): string
    {
        return value.replace(/\s+/g, '').replace(/(\n|\r)/g, '').replace(/[^a-zA-Z0-9.]/g, '_');
    }

    public static getFileTypeIcon(filename: string): string
    {
        const path = './assets/icons/flat/ui_set/custom_icons/polaroids_small_2.svg';

        try
        {
            if (filename !== '')
            {
                // path = './assets/icons/flat/ui_set/files-types/svg/' + $filter('lowercase')(filename.split('.')[filename.split('.').length - 1]) + '.svg';
            }
        }
        catch (err)
        {
            console.log(err);
        }

        return path;
    }

    public static getFileTypeCoverImage(type: string): string
    {
        let path = '';

        try
        {
            switch (type)
            {
                case AppConst.mediaType.VIDEO:
                    path = './assets/icons/flat/ui_set/media-technology/svg/042-video.svg';
                    break;
                case AppConst.mediaType.AUDIO:
                    path = './assets/icons/flat/ui_set/media-technology/svg/013-speaker.svg';
                    break;
                case AppConst.mediaType.DOC:
                    path = './assets/icons/flat/ui_set/media-technology/svg/029-folder.svg';
                    break;
                case AppConst.mediaType.OTHERS:
                    path = './assets/icons/flat/ui_set/media-technology/svg/018-newspaper.svg';
                    break;
                default:
                    path = './assets/icons/flat/ui_set/custom_icons/polaroids_small_2.svg';
            }
        }
        catch (err)
        {
            // not found
        }

        return path;
    }

    public static titleCase(str: string): string
    {
        const splitStr = str.toLowerCase().split(' ');

        for (let i = 0; i < splitStr.length; i++)
        {
            // You do not need to check if i is larger than splitStr length, as your for does that for you
            // Assign it back to the array
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        
        // Directly return the joined string
        return splitStr.join(' ');
    }

}
