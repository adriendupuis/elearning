cmi5Reveal='reveal.cmi5.js reveal.utils.js cmi5.utils.js';
cmi5Gift='gift.css gift.js gift.cmi5.js array.shuffle.js jqueryui.matching.* cmi5.utils.js';

# ./cmi5.sh OUTPUT_FILE TITLE INDEX_FILE RESOURCE_FILES… $cmi5(Reveal|Gift)

./cmi5.sh revealjs.cmi5.zip 'reveal.cmi5.js Demo AU' reveal.cmi5.html reveal.js.md download/ $cmi5Reveal;

openssl base64 -in gift.dirty.txt -out gift.encoded.txt;
./cmi5.sh gift.cmi5.zip 'cmi5 GIFT Demo AU' gift.cmi5.html gift.encoded.txt gift.md $cmi5Gift;
rm gift.encoded.txt;
