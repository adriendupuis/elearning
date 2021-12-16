let RevealUtils = {
    encodeLocation: function (indexh, indexv) {
        return (1 + indexh) + '.' + (1 + indexv);
    },
    decodeLocation: function (code) {
        let parts = code.split('.');
        return {
            indexh: parts[0] - 1,
            indexv: parts[1] - 1
        };
    },
    seenSlides: [],
    addSeenSlide: function (indexh, indexv) {
        let key = this.encodeLocation(indexh, indexv);
        if (0 > this.seenSlides.indexOf(key)) {
            this.seenSlides.push(key);
        }
    },
    setSeenSlides: function (seenSlides) {
        this.seenSlides = seenSlides.sort(function (a, b) {
            return a - b;
        });
    },
    getSeenSlides: function () {
        this.seenSlides.sort(function (a, b) {
            return a - b;
        });
        return this.seenSlides;
    },
    hasSeenAllSlides: function () {
        return Reveal.getTotalSlides() === this.seenSlides.length;
    },
    getProgress: function () {
        console.log(Reveal.getProgress(), this.seenSlides.length / Reveal.getTotalSlides());
        return this.seenSlides.length / Reveal.getTotalSlides();
    },
    fixLinks: function () {
        let anchors = document.getElementsByTagName('a');
        for (var i = 0; i < anchors.length; i++) {
            this.fixExternalLink(anchors[i]);
            this.fixFragmentLink(anchors[i]);
        }
    },
    fixExternalLink: function (anchor) {
        if (/^(https?:)?\/\//.test(anchor.getAttribute('href'))) {
            anchor.setAttribute('target', '_blank');
        }
    },
    fixFragmentLink: function (anchor) {
        if (/^#/.test(anchor.getAttribute('href'))) {
            let fragment = anchor.getAttribute('href').replace('#', '');
            let slide = this.getElementSlide('a[name="' + fragment + '"]');
            if (!slide) {
                try {
                    slide = this.getElementSlide(decodeURI(fragment));
                } catch (e) {}
            }
            if (slide) {
                let indices = Reveal.getIndices(slide);
                anchor.setAttribute('href', '#/' + indices.h + (indices.v ? '/' + indices.v : ''));
            }
        }
    },
    getElementSlide: function (selector) {
        let element = document.querySelector(selector);
        if (element) {
            return element.closest('.reveal .slides section');
        }
        return null;
    }
};
