// Docs:
// - https://revealjs.com/api/
// - https://pipwerks.com/laboratory/scorm/api-wrapper-javascript/
// - https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/

if ('undefined' === typeof pipwerks || 'undefined' === typeof pipwerks.SCORM) {
    console.log('dependency error: pipwerks\' SCORM API Wrapper is missing');
}
if ('undefined' === typeof Reveal) {
    console.log('dependency error: reveal.js is missing');
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
        if (RevealUtils.hasSeenAllSlides()) {
            ScormUtils.complete();
        } else {
            ScormUtils.multipleSetAndSave({
                'cmi.suspend_data': RevealUtils.getSeenSlides()
            });
        }
    });
}

let ScormUtils = {
    previousData: [],
    set: function(key, data) {
        if ('object' == typeof data) {
            data = JSON.stringify(data);
        }
        if (data !== this.previousData[key]) {
            pipwerks.SCORM.set('cmi.suspend_data', data);
            this.previousData[key] = data;
            return true;
        }
        return false;
    },
    multipleSetAndSave: function(datas) {
        let hasChanged = false;
        for (const key in datas) {
            hasChanged = hasChanged || this.set(key, datas[key]);
        }
        if (hasChanged) {
            pipwerks.SCORM.save();
        }
    },
    complete: function() {
        this.multipleSetAndSave({
            'cmi.core.lesson_status': 'completed',
            'cmi.core.exit': ''
        });
        pipwerks.SCORM.quit();
    }
};

let RevealUtils = {
    encodeLocation: function(indexh, indexv) {
        return (1+indexh) + '.' + (1+indexv);
    },
    decodeLocation: function(code) {
        let parts = code.split('.');
        return {
            indexh: parts[0]-1,
            indexv: parts[1]-1
        };
    },
    seenSlides: [],
    addSeenSlide: function(indexh, indexv) {
        let key = this.encodeLocation(indexh, indexv);
        if (0 > this.seenSlides.indexOf(key)) {
            this.seenSlides.push(key);
        }
    },
    setSeenSlides: function(seenSlides) {
        this.seenSlides = seenSlides.sort(function(a, b) {
            return a - b;
        });
    },
    getSeenSlides: function() {
        this.seenSlides.sort(function(a, b) {
            return a - b;
        });
        return this.seenSlides;
    },
    hasSeenAllSlides: function() {
        return Reveal.getTotalSlides() === this.seenSlides.length;
    }
};
