$(function () {
    let threshold = 0;
    $(document).scroll(function () {
        let scrollTop = $(this).scrollTop();
        let anchor = null;
        $('*[id], a[name]').each(function () {
            console.log(scrollTop, $(this).offset(), $(this).position());
            if ($(this).offset().top - scrollTop <= threshold) {
                anchor = $(this).attr('id');
                if ('undefined' === typeof anchor) {
                    anchor = $(this).attr('name');
                }
            }
        });
        if (anchor) {
            history.pushState(null, null, '#' + anchor);
            ScormUtils.multipleSetAndSave({
                'cmi.core.lesson_status': 'incomplete',
                'cmi.core.exit': 'suspend',
                'cmi.suspend_data': anchor
            });
        }
        console.log(anchor);
        if ($(document).height() - $(window).height() <= scrollTop) {
            console.log('complete');
            history.pushState(null, null, '#');
            ScormUtils.complete();
            $(document).off('scroll');
        }
    });
});
