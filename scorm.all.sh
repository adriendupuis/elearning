# ./scorm.sh OUTPUT_FILE TITLE INDEX_FILE RESOURCE_FILES…
./scorm.sh revealjs.scorm.zip 'SCORM reveal.js Demo SCO' scorm.reveal.js.html reveal.js.md download/ scorm.reveal.js reveal.utils.js scorm.utils.js;
openssl base64 -in gift.dirty.txt -out gift.encoded.txt;
./scorm.sh gift.scorm.zip 'SCORM GIFT Demo SCO' scorm.gift.html gift.encoded.txt gift.md gift.css gift.js scorm.gift.js array.shuffle.js jqueryui.matching.* scorm.utils.js;
rm gift.encoded.txt;
