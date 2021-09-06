./scorm.sh revealjs.zip 'SCORM reveal.js Demo SCO' scorm.reveal.js.html scorm.reveal.js* utils.*.js;
openssl base64 -in scorm.gift.txt -out scorm.gift.encoded.txt;
./scorm.sh gift.zip 'SCORM GIFT Demo SCO' scorm.gift.html scorm.gift.js scorm.gift.encoded.txt;
