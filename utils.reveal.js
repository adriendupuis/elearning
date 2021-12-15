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
    },
    getProgress: function() {
        console.log(Reveal.getProgress(), this.seenSlides.length/Reveal.getTotalSlides());
        return this.seenSlides.length/Reveal.getTotalSlides();
    }
};
