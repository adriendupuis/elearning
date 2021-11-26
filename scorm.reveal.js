// Docs:
// - https://revealjs.com/api/
// - https://pipwerks.com/laboratory/scorm/api-wrapper-javascript/
// - https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/

if ('undefined' === typeof pipwerks || 'undefined' === typeof pipwerks.SCORM) {
    console.log('dependency error: pipwerks\' SCORM API Wrapper is missing');
}
if ('undefined' === typeof ScormUtils) {
    console.log('dependency error: utils.scorm.js is missing');
}
if ('undefined' === typeof Reveal) {
    console.log('dependency error: reveal.js is missing');
}
if ('undefined' === typeof RevealUtils) {
    console.log('dependency error: utils.reveal.js is missing');
}

if (pipwerks.SCORM.init()) {
    Reveal.addEventListener('ready', function (event) {
        if (1 >= Reveal.getTotalSlides()) {
            ScormUtils.complete();
            return;
        }
        switch (pipwerks.SCORM.get('cmi.core.lesson_status')) {
            case 'incomplete':
                let seenSlides = pipwerks.SCORM.get('cmi.suspend_data');
                if (seenSlides.length) {
                    try {
                        seenSlides = JSON.parse(seenSlides);
                        RevealUtils.setSeenSlides(seenSlides);
                    } catch(error) {}
                }

                let location = pipwerks.SCORM.get('cmi.core.lesson_location');
                if (location.length) {
                    location = RevealUtils.decodeLocation(location);
                    Reveal.slide(location.indexh, location.indexv);
                }

                break;
        }
        let currentSlideIndices = Reveal.getIndices();
        RevealUtils.addSeenSlide(currentSlideIndices.h, currentSlideIndices.v);
        ScormUtils.multipleSetAndSave({
            'cmi.core.lesson_status': 'incomplete',
            'cmi.core.exit': 'suspend',
            'cmi.suspend_data': RevealUtils.getSeenSlides()
        });
    });
    Reveal.addEventListener('slidechanged', function (event) {
        pipwerks.SCORM.set('cmi.core.lesson_location', RevealUtils.encodeLocation(event.indexh, event.indexv));
        RevealUtils.addSeenSlide(event.indexh, event.indexv);
        ScormUtils.multipleSetAndSave({
            'cmi.suspend_data': RevealUtils.getSeenSlides(),
            'cmi.core.session_time': ScormUtils.getCmiTimespan(new Date().getTime() - ScormUtils.startTime.getTime())
        });
        if (RevealUtils.hasSeenAllSlides()) {
            ScormUtils.complete();
        }
    });
}
