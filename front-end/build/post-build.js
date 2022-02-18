/*jshint esversion: 6 */

const path = require('path');
const fs = require('fs');
const util = require('util');

// get application version from package.json
const appVersion = require('../package.json').version;

// promisify core API's
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

console.log('\nRunning post-build tasks');

// our version.json will be in the dist folder
const versionFilePath = path.join(__dirname + '/../dist/kinderm8/version.json');

let mainHash = '';
let mainBundleFile = [];

// RegExp to find main.bundle.js, even if it doesn't include a hash in it's name (dev build)
let mainBundleRegexpSingle = /^main-?([a-z0-9]*)?.?([a-z0-9]*)?.js$/;
let mainBundleRegexp = /^main-?([^]*)?.?([a-z0-9]*)?.js$/;

// read the dist folder files and find the one we're looking for
readDir(path.join(__dirname, '../dist/kinderm8/'))
    .then((files) => 
    {
        mainBundleFile = files.filter((f) => mainBundleRegexp.test(f));

        if (mainBundleFile && mainBundleFile.length > 0) 
        {
            let matchHash = mainBundleFile[0].match(mainBundleRegexpSingle);

            // if it has a hash in it's name, mark it down
            if (matchHash.length > 2 && !!matchHash[2]) 
            {
                mainHash = matchHash[2];
            }
        }

        // write current version and hash into the version.json file
        const data = {
            version: appVersion,
            hash: mainHash
        };

        console.log(`Writing version and hash to ${versionFilePath}`, data);

        return writeFile(versionFilePath, JSON.stringify(data, null, 4));
    })
    .then(() => 
    {
        // main bundle file not found, dev build?
        if (!mainBundleFile && mainBundleFile.length < 1) 
        {
            return;
        }

        console.log(`Replacing hash in the ${mainBundleFile}`);

        mainBundleFile.forEach(file => 
        {
            // replace hash placeholder in our main.js file so the code knows it's current hash
            const mainFilepath = path.join(__dirname, '../dist/kinderm8/', file);
    
            readFile(mainFilepath, 'utf8')
                .then((mainFileData) => 
                {
                    const replacedFile = mainFileData.replace('{{POST_BUILD_ENTERS_HASH_HERE}}', mainHash);

                    return writeFile(mainFilepath, replacedFile);
                });
        });

    })
    .catch((err) => 
    {
        console.log('Error with post build:', err);
    });
