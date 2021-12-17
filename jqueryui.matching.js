$.widget('custom.matching', {
    options: {
        draggable: '.source',
        droppable: '.target',
        invert: false
    },
    _create: function () {
        let draggableSelector = this.options.invert ? this.options.droppable : this.options.draggable;
        let droppableSelector = this.options.invert ? this.options.draggable : this.options.droppable ;

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
                if (previousDraggable) {
                    if (currentDraggable.is(previousDraggable)) {
                        return;
                    }
                    let previousDroppable = currentDraggable.data('droppable');
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
                        previousDraggable.data('droppable', previousDroppable);
                        previousDraggable.removeClass('matched');
                    }
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
                    previousDroppable.data('draggable', null).removeClass('matched');;
                    $(ui.draggable).data('droppable', null).removeClass('matched');;
                }
            }
        })
    },
    getMatches: function() {
        let matches = [];
        this.element.find(this.options.invert ? this.options.draggable : this.options.droppable).each(function(index, droppable) {
            let draggable = $(droppable).data('draggable');
            if (draggable) {
                let match = [
                    $(droppable).data('draggable'),
                    $(droppable)
                ];
                if (this.options.invert) {
                    match.reverse()
                }
                matches.push(match);
            }
        }.bind(this));

        return matches;
    }
});
