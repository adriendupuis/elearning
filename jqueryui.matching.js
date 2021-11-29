$.widget('custom.matching', {
    options: {
        drop: null
    },
    _create: function () {
        this.src = this.element.find('.matching-source-stack');
        this.dest = this.element.find('.matching-destination-stack');
        this.src.children().each(function () {
            $(this).draggable({
                revert: 'invalid'
            });
        }).each(function (index, element) {
            $(element).data({
                source: this.src,
                matching: this
            });
        }.bind(this));
        this.src.droppable({
            tolerance: 'pointer',
            hoverClass: 'matching-source-hover',
            drop: function (event, ui) {
                ui.draggable.detach().css({
                    top: 0,
                    left: 0
                }).appendTo($(this)).data('source', $(this));
            }
        });
        this.dest.children().each(function () {
            $(this).droppable({
                tolerance: 'pointer',
                hoverClass: 'matching-destination-hover',
                drop: function (event, ui) {
                    let draggable = ui.draggable;
                    let storage = $(this).find('.matching-destination-storage');
                    let previousDraggable = storage.children();
                    if (!previousDraggable.length || previousDraggable.length && previousDraggable.text() !== draggable.text()) {
                        if (previousDraggable.length) {
                            previousDraggable.detach().css({
                                top: 0,
                                left: 0
                            }).appendTo(draggable.data('source'));
                        }
                        draggable.detach().css({
                            top: 0,
                            left: 0
                        }).appendTo(storage).data('source', storage);
                        if ('function' === typeof draggable.data('matching').options.drop) {
                            draggable.data('matching').options.drop.bind(this);
                            draggable.data('matching').options.drop(event, ui);
                        }
                    }
                }
            });
        });
    }
});
