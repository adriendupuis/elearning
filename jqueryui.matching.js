$.widget('custom.matching', {
    options: {
        source: '.matching-source',
        target: '.matching-target',
        draggable: '.matching-target',
        droppable: '.matching-source'
    },
    _create: function () {
        let draggableSelector = this.options.draggable;
        let droppableSelector = this.options.droppable;

        let wrapper = this.element.closest('[id]');
        this.element.find(draggableSelector).draggable({
            handle: '.handle',
            snap: droppableSelector + ' .handle',
            snapMode: 'inner',
            snapTolerance: 10,
            revert: 'invalid'
        });
        this.element.find(droppableSelector + ' .handle').droppable({
            accept: (wrapper ? '#' + wrapper.attr('id') : '') + ' ' + draggableSelector,
            greedy: true,
            hoverClass: 'hover',
            tolerance: 'pointer',
            drop: function (event, ui) {
                let currentDroppable = $(this).closest(droppableSelector);
                let currentDraggable = $(ui.draggable);

                let previousDraggable = currentDroppable.data('draggable');
                let previousDroppable = currentDraggable.data('droppable');
                if (previousDraggable) {
                    if (previousDroppable) {
                        let currentDroppablePosition = currentDroppable.position();
                        let previousDroppablePosition = previousDroppable.position();
                        previousDraggable.css({
                            top: '+=' + (previousDroppablePosition.top - currentDroppablePosition.top),
                            left: '+=' + (previousDroppablePosition.left - currentDroppablePosition.left),
                        });
                        previousDroppable.data('draggable', previousDraggable);
                        previousDroppable.addClass('matched');
                        previousDraggable.data('droppable', previousDroppable);
                        previousDraggable.addClass('matched');
                    } else {
                        previousDraggable.css({top: 0, left: 0});
                        previousDraggable.data('droppable', null);
                        previousDraggable.removeClass('matched');
                    }
                } else if (previousDroppable) {
                    if (currentDroppable.is(previousDroppable)) {
                        return;
                    }
                    previousDroppable.data('draggable', null);
                    previousDroppable.removeClass('matched');
                }

                currentDroppable.data('draggable', currentDraggable);
                currentDroppable.addClass('matched');
                currentDraggable.data('droppable', currentDroppable);
                currentDraggable.addClass('matched');
            }
        });
        this.element.droppable({
            accept: (wrapper ? '#' + wrapper.attr('id') : '') + ' ' + draggableSelector,
            drop: function (event, ui) {
                let previousDroppable = $(ui.draggable).data('droppable');
                if (previousDroppable) {
                    previousDroppable.data('draggable', null).removeClass('matched');
                    $(ui.draggable).data('droppable', null);
                }
                $(ui.draggable).removeClass('matched').css({top: 0, left: 0});
            }
        })
    },
    getMatches: function () {
        let matches = [];
        this.element.find(this.options.droppable).each(function (index, droppable) {
            let draggable = $(droppable).data('draggable');
            if (draggable) {
                if ($(droppable).is(this.options.source)) {
                    matches.push([
                        $(droppable),
                        draggable
                    ]);
                } else {
                    matches.push([
                        draggable,
                        $(droppable)
                    ]);
                }
            }
        }.bind(this));

        return matches;
    }
});
