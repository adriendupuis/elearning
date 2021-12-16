# ./cmi5.sh OUTPUT_FILE TITLE INDEX_FILE RESOURCE_FILES…
./cmi5.sh revealjs.cmi5.zip 'cmi5 reveal.js Demo AU' cmi5.reveal.js.html reveal.js.md download/ cmi5.reveal.js reveal.utils.js cmi5.utils.js;
openssl base64 -in gift.txt -out gift.encoded.txt;
./cmi5.sh gift.cmi5.zip 'cmi5 GIFT Demo AU' cmi5.gift.html gift.encoded.txt gift.md gift.css gift.js cmi5.gift.js array.shuffle.js jqueryui.matching.* cmi5.utils.js;
rm gift.encoded.txt;
