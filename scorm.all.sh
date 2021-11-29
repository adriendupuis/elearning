# ./scorm.sh OUTPUT_FILE TITLE INDEX_FILE RESOURCE_FILES…
./scorm.sh revealjs.scorm.zip 'SCORM reveal.js Demo SCO' scorm.reveal.js.html reveal.js.md download/ scorm.reveal.js utils.reveal.js utils.scorm.js;
openssl base64 -in gift.txt -out gift.encoded.txt;
./scorm.sh gift.zip 'SCORM GIFT Demo SCO' scorm.gift.html gift.encoded.txt gift.md scorm.gift.js array.shuffle.js utils.scorm.js;
