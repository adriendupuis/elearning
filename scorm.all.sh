scormReveal='scorm.reveal.js reveal.utils.js scorm.utils.js popin.js popin.css';
scormGift='gift.css gift.js scorm.gift.js array.shuffle.js jqueryui.matching.* scorm.utils.js';

# ./scorm.sh OUTPUT_FILE TITLE INDEX_FILE RESOURCE_FILES… $scorm(Reveal|Gift)

./scorm.sh revealjs.scorm.zip 'SCORM reveal.js Demo SCO' scorm.reveal.js.html reveal.js.md download/ $scormReveal;

openssl base64 -in gift.dirty.txt -out gift.encoded.txt;
./scorm.sh gift.scorm.zip 'SCORM GIFT Demo SCO' scorm.gift.html gift.encoded.txt gift.md $scormGift;
rm gift.encoded.txt;
