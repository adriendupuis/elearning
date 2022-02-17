scormReveal='reveal.scorm.js reveal.utils.js scorm.utils.js';
scormGift='gift.css gift.js gift.scorm.js array.shuffle.js jqueryui.matching.* scorm.utils.js';

# ./scorm.sh OUTPUT_FILE TITLE INDEX_FILE RESOURCE_FILES… $scorm(Reveal|Gift)

./scorm.sh revealjs.scorm.zip 'SCORM reveal.js Demo SCO' reveal.scorm.html reveal.md download/ $scormReveal;

openssl base64 -in gift.dirty.txt -out gift.encoded.txt;
./scorm.sh gift.scorm.zip 'SCORM GIFT Demo SCO' gift.scorm.html gift.encoded.txt gift.md $scormGift;
rm gift.encoded.txt;
