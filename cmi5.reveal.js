
if ('undefined' === typeof cmi5Controller) {
    console.log('dependency error: cmi5Controller.js is missing');
}
if ('undefined' === typeof SendStatement || 'undefined' === typeof FinishAU) {
    console.log('dependency error: cmi5Wrapper.js is missing');
}
if ('undefined' === typeof Cmi5Utils) {
    console.log('dependency error: utils.scorm.js is missing');
}
if ('undefined' === typeof Reveal) {
    console.log('dependency error: reveal.js is missing');
}
if ('undefined' === typeof RevealUtils) {
    console.log('dependency error: utils.reveal.js is missing');
}

Reveal.addEventListener('ready', function (event) {
    console.log('ready');
    Cmi5Utils.initCmi5Controller();
    cmi5Controller.startUp(function () {
        console.log('startUp');
        //TODO: WHERE DO WE GET THIS INFOS?
        cmi5Controller.setObjectProperties('en-US', 'http://adlnet.gov/expapi/activities/assessment', 'reveal.js AU Example', 'This is a sample of an AU.');
        SendStatement('Initialized');
        /** /
        cmi5Controller.getAllowedState('slideStates', null, function(result) {
            console.log(result);
            if (result.response) {
                let slideStates = JSON.parse(result.response);
                console.log(slideStates);
                //TODO: go to slideStates.currentSlide
                //TODO: RevealUtils.setSeenSlides(slideStates.seenSlides);
            }
        });
        /**/
        let currentSlideIndices = Reveal.getIndices();
        console.log(currentSlideIndices);
        RevealUtils.addSeenSlide(currentSlideIndices.h, currentSlideIndices.v);

        Reveal.addEventListener('slidechanged', function (event) {
            RevealUtils.addSeenSlide(event.indexh, event.indexv);
            console.log(
                'slidechanged',
                RevealUtils.encodeLocation(event.indexh, event.indexv),
                RevealUtils.hasSeenAllSlides()
            );
            if (RevealUtils.hasSeenAllSlides()) {
                SendStatement('Completed');
                FinishAU();
            } else {
                cmi5Controller.sendAllowedState('slideStates', JSON.stringify({
                    currentSlide: RevealUtils.encodeLocation(event.indexh, event.indexv), //lesson_location
                    seenSlides: RevealUtils.getSeenSlides() //suspend_data
                }), null, null, function(result) {
                    console.log(result);
                });
            }
        });
    }, function () {
        console.log('startUpError');
    });
});
