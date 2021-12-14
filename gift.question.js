class Question {
    type = null;
    index = null;
    id = null;
    title = null;
    text = null;
    responses = [];
    weight = 1;
    startTime = null;
    lastTime = null;
    latency = 0;
    studentCorrectResponseCount = null;
    studentWrongResponseCount = null;
    correctResponse = [];
    studentResponse = [];
    element = null;

    constructor(id = null, title = null, text = null, responses = []) {
        this.id = id;
        this.title = title;
        this.text = text;
        this.responses = responses;
    }

    getType() {
        return this.type;
    }

    getIndex() {
        return this.index;
    }

    setIndex(index) {
        this.index = index;
        return this;
    }

    getId() {
        return this.id;
    }

    setId(id) {
        this.id = id;
        return this;
    }

    getTitle() {
        return this.title;
    }

    getText() {
        return this.text;
    }

    getResponses() {
        return this.responses;
    }

    getWeight() {
        return this.weight;
    }

    render(questionContainerElement) {
        throw new Error('Not yet implemented at typed question level');
        return '';
    }

    getElement() {
        if (null === this.element) {
            this.element = $('#' + this.getId());
        }
        return this.element;
    }


    start() {
        if (null === this.startTime) {
            this.startTime = new Date();
        }
        if (null === this.lastTime) {
            this.lastTime = new Date();
        }
        return this;
    }

    stop() {
        this.latency = new Date().getTime() - this.lastTime.getTime();
        this.lastTime = null;
        return this;
    }

    getStartTime() {
        return this.startTime;
    }

    getLatency() {
        return this.latency;
    }

    setCorrection(cached = true) {
        throw new Error('Not yet implemented at typed question level');
        return this;
    }

    getCorrectResponse(cached = true) {
        this.setCorrection(cached);
        return this.correctResponse;
    }

    getStudentResponse(cached = true) {
        this.setCorrection(cached);
        return this.studentResponse;
    }

    getStudentCorrectResponseCount(cached = true) {
        this.setCorrection(cached);
        return this.studentCorrectResponseCount;
    }

    getStudentWrongResponseCount(cached = true) {
        this.setCorrection(cached);
        return this.studentWrongResponseCount;
    }

    getScore(cached = true) {
        this.setCorrection(cached);
        return Math.max(0, Math.min((this.getStudentCorrectResponseCount() - this.getStudentWrongResponseCount() / 2) / this.getCorrectResponse().length, 1));
    }

    getResult(cached = true) {
        switch (this.getScore(cached)) {
            case 1:
                return 'correct';
            case 0:
                return 'wrong';
            default:
                return 'neutral';
        }
    }
}

class GiftQuestion {
    static parse(code) {
        let titleRegExp = /::([^:]+)::/;

        let openingBracketIndex = GiftQuestion.indexOfSpecialCharacter(code, '{');
        let closingBracketIndex = GiftQuestion.indexOfSpecialCharacter(code, '}');

        let text = code.substring(0, openingBracketIndex).trim();
        let title = null, titleMatch = titleRegExp.exec(text);
        let id = null;
        if (null !== titleMatch) {
            title = titleMatch[1].trim();
            text = text.replace(titleRegExp, '').trim();
        }

        let responsesCode = code.substring(openingBracketIndex + 1, closingBracketIndex).trim();

        // True/False
        if (GiftQuestion.inArray(responsesCode, ['T', 'F'])) {
            return new TrueFalseQuestion(id, title, text, ['T' === responsesCode]);
        }

        /* Multiple response elements question types */
        let responseParts = responsesCode.split(/((?<!\\)[~=])/);
        responseParts.shift();
        let responses = [];

        // Matching or Sequencing
        if (-1 < responsesCode.indexOf(' -> ')) {
            for (const part of responseParts) {
                if (GiftQuestion.inArray(part, ['=', '~'])) {
                    if ('~' === part) {
                        this.log('parse error: there is no wrong response in matching question type.')
                    }
                    continue;
                }
                responses.push(GiftQuestion.formatText(part).split(' -> '));
            }
            let isSequencingType = true;
            $.each(responses, function (index, response) {
                if (!/^[0-9]+$/.test(response[1])) {
                    isSequencingType = false;
                    return false;
                }
            });
            return isSequencingType ? new SequencingQuestion(id, title, text, responses) : new MatchingQuestion(id, title, text, responses);
        }

        //TODO: other question types

        // Multiple Choice
        let isCorrectResponse = null;
        for (const part of responseParts) {
            if (GiftQuestion.inArray(part, ['=', '~'])) {
                isCorrectResponse = '=' === part;
                continue;
            }
            if (null === isCorrectResponse) {
                this.log('parse error: response is not correct nor wrong');
            }
            responses.push({
                isCorrect: isCorrectResponse,
                index: responses.length,
                hash: Date.now().toString(36) + Math.random().toString(36).substr(2),
                text: GiftQuestion.formatText(part)
            });
            isCorrectResponse = null;
        }
        return new ChoiceQuestion(id, title, text, responses);
    }

    static indexOfSpecialCharacter(line, character, index = 0) {
        let indexOf = line.indexOf(character, index);
        if (0 < indexOf) {
            if ('\\' === line[indexOf - 1]) {
                indexOf = this.indexOfSpecialCharacter(line, character, indexOf + 1);
            }
        }
        return indexOf;
    }

    static inArray(item, array) {
        return -1 < $.inArray(item, array);
    }

    static formatText(code) {
        return GiftQuestion.unescapeSpecialCharacters(GiftQuestion.addNewLines(
            code.trim()
                .replace(/```(\w+)\n? *?/g, '<pre><code class="$1">').replace(/\n? *?```/g, '</code></pre>')
                .replace(/`(.+)`/g, '<code>$1</code>')
        )).trim();
    }

    static unescapeSpecialCharacters(code) {
        return code.replace(/\\([~=#{}])/g, '$1');
    }

    static addNewLines(code) {
        return code.replace(/\\n/g, "\n").replace(/\n/g, '<br>');
    }
}

class TrueFalseQuestion extends Question {
    type = 'true-false';

    render(questionContainerElement) {
        questionContainerElement.append($('<label><input type="radio" name="' + this.getId() + '" value="true"> True</label>'));
        questionContainerElement.append($('<label><input type="radio" name="' + this.getId() + '" value="false"> False</label>'));
    }

    setCorrection(cached) {
        if (null === this.studentCorrectResponseCount || false === cached) {
            let studentResponse = this.getElement().find('input:checked').val();
            if (GiftQuestion.inArray(studentResponse, ['true', 'false'])) {
                studentResponse = 'true' === studentResponse;
            } else if ('boolean' !== typeof studentResponse) {
                studentResponse = null;
            }
            this.studentCorrectResponseCount = studentResponse === this.responses[0] ? 1 : 0;
            this.studentWrongResponseCount = studentResponse === !this.responses[0] ? 1 : 0;
            this.correctResponse = this.responses;
            this.studentResponse = [studentResponse];
        }
        return this;
    }
}

class ChoiceQuestion extends Question {
    type = 'choice';

    render(questionContainerElement) {
        let list = $('<ul>');
        $.each(this.getResponses().shuffle(), function (index, response) {
            list.append($('<li><label><input type="checkbox" name="' + this.getId() + '" value="' + response.hash + '"> ' + response.text + '</label></li>'));
        }.bind(this));
        list.appendTo(questionContainerElement);
    }

    setCorrection(cached) {
        if (null === this.studentCorrectResponseCount || false === cached) {
            let questionContainerElement = this.getElement();
            let studentCorrectResponseCount = 0;
            let studentWrongResponseCount = 0;
            let correctResponse = [];
            let studentResponse = [];

            $.each(this.getResponses(), function (index, response) {
                let isStudentResponse = questionContainerElement.find('input[value="' + response.hash + '"]').is(':checked');
                if (response.isCorrect) {
                    correctResponse.push(index);
                    if (isStudentResponse) {
                        studentResponse.push(index);
                        ++studentCorrectResponseCount;
                    }
                } else if (isStudentResponse) {
                    studentResponse.push(index);
                    ++studentWrongResponseCount;
                }
            });

            this.studentCorrectResponseCount = studentCorrectResponseCount;
            this.studentWrongResponseCount = studentWrongResponseCount;
            this.correctResponse = correctResponse;
            this.studentResponse = studentResponse;
        }
        return this;
    }
}

class SequencingQuestion extends Question {
    type = 'sequencing';

    render(questionContainerElement) {
        let list = $('<ul>');
        $.each(this.responses.shuffle(), function (index, response) {
            list.append($('<li>' + response[0] + '</li>'));
        });
        list.appendTo(questionContainerElement).sortable();
    }

    setCorrection(cached) {
        if (null === this.studentCorrectResponseCount || false === cached) {
            let questionContainerElement = this.getElement();
            let correctResponse = [];
            for (const key of this.responses.keys()) {
                correctResponse.push(key);
            }
            let studentCorrectResponseCount = 0;
            let studentWrongResponseCount = 0;
            let studentResponse = [];

            // From SCORM RTE specs: "The final positioning of the elements is used to determine correctness, not the order in which they were sequenced."
            $(questionContainerElement).find('li').each(function (index, item) {
                if ($(item).text() === this.responses[index][0]) {
                    studentCorrectResponseCount++;
                    studentResponse.push(index);
                } else {
                    studentWrongResponseCount++;
                    $.each(this.responses, function (responseIndex, response) {
                        if ($(item).text() === response[0]) {
                            studentResponse.push(responseIndex);
                            return false;
                        }
                    });
                }
            }.bind(this));

            this.studentCorrectResponseCount = studentCorrectResponseCount;
            this.studentWrongResponseCount = studentWrongResponseCount;
            this.correctResponse = correctResponse;
            this.studentResponse = studentResponse;
        }
        return this;
    }
}

class MatchingQuestion extends Question {
    type = 'matching';

    render(questionContainerElement) {
        let sourceStack = $('<ul class="matching-source-stack">');
        $.each(this.responses.shuffle(), function (index, response) {
            sourceStack.append($('<li class="matching-source-item matching-source-text">' + response[0] + '</li>'));
        });
        sourceStack.appendTo(questionContainerElement);
        let targetStack = $('<ul class="matching-target-stack">');
        $.each(this.responses.shuffle().shuffle(), function (index, response) {
            targetStack.append($('<li class="matching-target-item"><span class="matching-target-text">' + response[1] + '</span><ul class="matching-target-storage"></ul></li>'));
        });
        targetStack.appendTo(questionContainerElement);
        questionContainerElement.matching({
            drop: function (event, ui) {
                let sourceStack = questionContainerElement.find('.matching-source-stack');
                let targetStack = questionContainerElement.find('.matching-target-stack');
                let sourceStackHeight = sourceStack.height();
                let targetStackHeight = targetStack.height();
                if (sourceStackHeight < targetStackHeight) {
                    sourceStack.height(targetStackHeight);
                } else if (sourceStackHeight > targetStackHeight) {
                    targetStack.height(sourceStackHeight);
                }
            }
        });
    }

    setCorrection(cached) {
        if (null === this.studentCorrectResponseCount || false === cached) {
            let studentCorrectResponseCount = 0;
            let studentWrongResponseCount = 0;
            let studentUnansweredCount = 0;
            let studentResponse = [];

            this.getElement().find('.matching-target-item').each(function (index, element) {
                let source = $(element).find('.matching-target-storage .matching-source-text').text();
                let target = $(element).find('.matching-target-text').text();
                if (!source.length) {
                    studentUnansweredCount++;
                } else {
                    let correct = false;
                    let sourceIndex = null, targetIndex = null;
                    $.each(this.responses, function (index, response) {
                        if (source === response[0]) {
                            sourceIndex = index;
                        }
                        if (target === response[1]) {
                            targetIndex = index;
                        }
                        if (null !== sourceIndex && null !== targetIndex) {
                            return false;
                        }
                    });
                    if (null === sourceIndex) { // Shouldn't occur
                        studentUnansweredCount++;
                    } else {
                        studentResponse.push(sourceIndex.toString() + '.' + targetIndex.toString())
                        if (sourceIndex === targetIndex) {
                            studentCorrectResponseCount++;
                        } else {
                            studentWrongResponseCount++;
                        }
                    }
                }
            }.bind(this));
            let correctResponse = [];
            $.each(this.responses, function (index, response) {
                correctResponse.push(index.toString() + '.' + index.toString());
            });

            this.studentCorrectResponseCount = studentCorrectResponseCount;
            this.studentWrongResponseCount = studentWrongResponseCount;
            this.correctResponse = correctResponse;
            this.studentResponse = studentResponse;
        }
        return this;
    }
}
