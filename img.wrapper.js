function wrapImg() {
    $('img').each(function () {
        $(this).wrap('<div style="overflow-y: scroll;">').parent().css('max-height', $('body').height() / 2 + 'px');
    });
}
