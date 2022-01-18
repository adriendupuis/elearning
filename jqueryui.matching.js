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
            revert: 'invalid',
            drag: function (event, ui) {
                let transform = $('.reveal > .slides').css('transform').match(/matrix\(([-.0-9]+), ([-.0-9]+), ([-.0-9]+), ([-.0-9]+), ([-.0-9]+), ([-.0-9]+)\)/);
                let scale = transform ? transform[1] : 1;
                let zoom = $(this).closest('section').css('zoom');
                var zoomScale = zoom * scale;

                var changeLeft = ui.position.left - ui.originalPosition.left;
                var newLeft = ui.originalPosition.left + changeLeft / zoomScale;
                var changeTop = ui.position.top - ui.originalPosition.top;
                var newTop = ui.originalPosition.top + changeTop / zoomScale;

                ui.position.left = newLeft;
                ui.position.top = newTop;
            }
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
                        let currentDroppablePosition = currentDroppable.find('.ui-droppable').length ? currentDroppable.find('.ui-droppable').position() : currentDroppable.position();
                        let previousDroppablePosition = previousDroppable.find('.ui-droppable').length ? previousDroppable.find('.ui-droppable').position() : previousDroppable.position();
                        previousDraggable.css({
                            top: '+=' + (previousDroppablePosition.top - currentDroppablePosition.top),
                            left: '+=' + (previousDroppablePosition.left - currentDroppablePosition.left),
                        });
                        previousDroppable.data('draggable', previousDraggable);
                        previousDroppable.addClass('matched');
                        previousDraggable.data('droppable', previousDroppable);
                        previousDraggable.addClass('matched');
                    } else {
                        //previousDraggable.css(previousDraggable.originalPosition);
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

// Override and fix some jQuery UI drag and drop manager methods for zoomed containers.
// See original methods at https://github.com/jquery/jquery-ui/blob/1.13.0/ui/widgets/droppable.js#L314
$(function () {
    var intersect = $.ui.intersect = (function () {
        function isOverAxis(x, reference, size) {
            return (x >= reference) && (x < (reference + size));
        }

        return function (draggable, droppable, toleranceMode, event) {
            if (!droppable.offset) {
                return false;
            }

            let transform = $('.reveal > .slides').css('transform').match(/matrix\(([-.0-9]+), ([-.0-9]+), ([-.0-9]+), ([-.0-9]+), ([-.0-9]+), ([-.0-9]+)\)/);
            let scale = transform ? transform[1] : 1;
            let zoom = $('.reveal > .slides > section.present').css('zoom') ? $('.reveal > .slides > section.present').css('zoom') : 1;
            var zoomScale = zoom * scale;

            var x1 = draggable.offset.left + draggable.position.left - draggable.originalPosition.left + draggable.margins.left, //here is the fix for scaled container
                y1 = draggable.offset.top + draggable.position.top - draggable.originalPosition.top + draggable.margins.top, //here is the fix for scaled container
                x2 = x1 + draggable.helperProportions.width,
                y2 = y1 + draggable.helperProportions.height,
                l = droppable.offset.left,
                t = droppable.offset.top,
                r = l + droppable.proportions().width,
                b = t + droppable.proportions().height;

            switch (toleranceMode) {
                case "fit":
                    return (l <= x1 && x2 <= r && t <= y1 && y2 <= b);
                case "intersect":
                    return (l < x1 + (draggable.helperProportions.width / 2) && // Right Half
                        x2 - (draggable.helperProportions.width / 2) < r && // Left Half
                        t < y1 + (draggable.helperProportions.height / 2) && // Bottom Half
                        y2 - (draggable.helperProportions.height / 2) < b); // Top Half
                case "pointer":
                    return isOverAxis(event.pageY/zoomScale, t, droppable.proportions().height) &&
                        isOverAxis(event.pageX/zoomScale, l, droppable.proportions().width);
                case "touch":
                    return (
                        (y1 >= t && y1 <= b) || // Top edge touching
                        (y2 >= t && y2 <= b) || // Bottom edge touching
                        (y1 < t && y2 > b) // Surrounded vertically
                    ) && (
                        (x1 >= l && x1 <= r) || // Left edge touching
                        (x2 >= l && x2 <= r) || // Right edge touching
                        (x1 < l && x2 > r) // Surrounded horizontally
                    );
                default:
                    return false;
            }
        };
    })();

    $.ui.ddmanager.drag = function (draggable, event) {
        // If you have a highly dynamic page, you might try this option. It renders positions
        // every time you move the mouse.
        if (draggable.options.refreshPositions) {
            $.ui.ddmanager.prepareOffsets(draggable, event);
        }

        // Run through all droppables and check their positions based on specific tolerance options
        $.each($.ui.ddmanager.droppables[draggable.options.scope] || [], function () {

            if (this.options.disabled || this.greedyChild || !this.visible) {
                return;
            }

            var parentInstance, scope, parent,
                intersects = intersect(draggable, this, this.options.tolerance, event),
                c = !intersects && this.isover ? 'isout' : (intersects && !this.isover ? 'isover' : null);
            if (!c) {
                return;
            }

            if (this.options.greedy) {

                // find droppable parents with same scope
                scope = this.options.scope;
                parent = this.element.parents(":data(ui-droppable)").filter(function() {
                    return $(this).droppable("instance").options.scope === scope;
                });

                if (parent.length) {
                    parentInstance = $(parent[0]).droppable("instance");
                    parentInstance.greedyChild = (c === "isover");
                }
            }

            // We just moved into a greedy child
            if (parentInstance && c === "isover") {
                parentInstance.isover = false;
                parentInstance.isout = true;
                parentInstance._out.call(parentInstance, event);
            }

            this[c] = true;
            this[c === "isout" ? "isover" : "isout"] = false;
            this[c === "isover" ? "_over" : "_out"].call(this, event);

            // We just moved out of a greedy child
            if (parentInstance && c === "isout") {
                parentInstance.isout = false;
                parentInstance.isover = true;
                parentInstance._over.call(parentInstance, event);
            }
        });
    };

    $.ui.ddmanager.drop = function (draggable, event) {
        var dropped = false;

        // Create a copy of the droppables in case the list changes during the drop (#9116)
        $.each(($.ui.ddmanager.droppables[draggable.options.scope] || []).slice(), function () {

            if (!this.options) {
                return;
            }
            if (!this.options.disabled && this.visible &&
                $.ui.intersect( draggable, this, this.options.tolerance, event ) ) {
                dropped = this._drop.call(this, event) || dropped;
            }

            if (!this.options.disabled && this.visible && this.accept.call(this.element[0],
                (draggable.currentItem || draggable.element))) {
                this.isout = true;
                this.isover = false;
                this._deactivate.call(this, event);
            }

        });
        return dropped;
    };
});
