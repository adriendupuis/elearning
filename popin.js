function popin(html) {
    $('<div class="popin-container">')
        .click(function (event) {
            event.preventDefault();
            event.stopPropagation();
            $('[class^="popin-"]').remove();
        })
        .append('<div class="popin-overlay">')
        .append($('<div class="popin-content-container">').html(html))
        .appendTo('body')
    ;
}

function popinImg(src) {
    popin('<img src="' + src + '" class="popin-image">');
    $('.popin-content-container').css('line-height', $('body').height() + 'px')
}

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
