if ('undefined' === typeof Cmi5) {
    console.log('dependency error: cmi5.js is missing');
}
if ('undefined' === typeof CourseCmi5Plugin) {
    console.log('dependency error: course_cmi5.js is missing');
}
if ('undefined' === typeof Reveal) {
    console.log('dependency error: reveal.js is missing');
}
if ('undefined' === typeof RevealUtils) {
    console.log('dependency error: reveal.utils.js is missing');
}

let cmi5Plugin = new CourseCmi5Plugin();

Reveal.addEventListener('ready', function (event) {
    RevealUtils.fixLinks();

    cmi5Plugin.initialize(function () {
        let seenSlides = cmi5Plugin.getSuspendData().then(function (suspendData) {
            if (suspendData) {
                if (suspendData.seenSlides && suspendData.seenSlides.length) {
                    RevealUtils.setSeenSlides(suspendData.seenSlides);
                }
                if (suspendData.bookmark) {
                    let location = RevealUtils.decodeLocation(suspendData.bookmark);
                    Reveal.slide(location.indexh, location.indexv);
                }
            }
        }).finally(function () {
            let currentSlideIndices = Reveal.getIndices();
            RevealUtils.addSeenSlide(currentSlideIndices.h, currentSlideIndices.v);
        });
        Reveal.addEventListener('slidechanged', function (event) {
            if (cmi5Plugin.cmi5._completed) {
                return;
            }
            RevealUtils.addSeenSlide(event.indexh, event.indexv);
            cmi5Plugin.experienced(RevealUtils.encodeLocation(event.indexh, event.indexv), 'slide-' + RevealUtils.encodeLocation(event.indexh, event.indexv), Math.floor(100 * RevealUtils.getProgress()));
            //cmi5Plugin.setBookmark(RevealUtils.encodeLocation(event.indexh, event.indexv));
            cmi5Plugin.setSuspendData({
                bookmark: RevealUtils.encodeLocation(event.indexh, event.indexv),
                seenSlides: RevealUtils.getSeenSlides()
            });
            if (RevealUtils.hasSeenAllSlides()) {
                cmi5Plugin.completed();
            }
        });
    }, function (result, error, activeStatementCount) {
        //console.log('callbackOnStatementSend', result, error, activeStatementCount);
    });
});
