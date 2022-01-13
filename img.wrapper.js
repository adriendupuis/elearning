function wrapImg() {
    $('img').each(function () {
        let img = new Image();
        img.src = this.src;
        let height = img.height;
        let width = img.width;

        if (('undefined' === typeof $(this).attr('style') || !$(this).attr('style').match(/(^|; *)(min-|max-)?(width|height):/))
            && 'undefined' === typeof $(this).attr('width') && 'undefined' === typeof $(this).attr('height')) {
            let thumbWidth = height > width ? 64 * width / height : 64;
            let thumbHeight = height >= width ? 64 : 64 * height / width;
            $(this).width(thumbWidth).height(thumbHeight);
        } else if (width <= $(this).width() || height <= $(this).height()) {
            return;
        }

        if (width > $('body').width() || height > $('body').height()) {
            $(this).wrap('<a target="_blank" href="' + this.src + '">');
        } else {
            $(this).click(function (event) {
                popinImg(event.target.src);
            }).addClass('clickable');
        }
    });
}

function popinImg(src) {
    let close = function (event) {
        event.preventDefault();
        event.stopPropagation();
        $('[class^="popin-"]').remove();
    };
    $('<div class="popin-container" style="position: absolute; z-index: 1; top: 0; left: 0; width: 100%; height: 100%;">')
        .click(close)
        .append('<div class="popin-overlay" style="position: absolute; z-index: 2; top: 0; left: 0; width: 100%; height: 100%; background: white; opacity: 0.9;">')
        .append('<div class="popin-image-container" style="position: absolute; z-index: 3; top: 0; left: 0; width: 100%; height: 100%; line-height: 100%; text-align: center;">'
            + '<img src="' + src + '" class="popin-image" style="vertical-align: middle; box-shadow: 0px 0px 40px 40px white;">')
        .appendTo('body')
        .find('.popin-image-container').css('line-height', $('body').height() + 'px')
    ;
}
