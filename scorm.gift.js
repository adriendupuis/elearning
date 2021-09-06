// Docs:
// - https://docs.moodle.org/en/GIFT_format

class Gift {
    constructor(url, container = '#gift-container', options = {}) {
        this.container = $(container);
        this.options = Object.assign({
            debug: false,
            subset: null,
            randomize: false,
            //slides: false,
            timer: null
        }, options);
        pipwerks.debug.isActive = this.options.debug;

        this.questionIdMap = {};
        this.questionCollection = [];

        this.load(url);
    }

    load(url) {
        $.ajax({
            url: url,
            success: this.parseAndRender.bind(this),
            dataType: 'text'
        });
    }

    parseAndRender(data) {
        if (!this.options.debug) {
            if ('undefined' === typeof atob) {
                this.log('runtime error: unsupported browser.');
                return;
            }
            data = atob(data);
        }
        this.parse(data).render();
    }

    parse(data) {
        let lines = data.split("\n");
        let questionIdMap = {};
        let questionCollection = [];
        let currentQuestionCode = '';
        let isInside = false;
        for (const line of lines) {
            //remove comments and white spaces
            let cleanedLine = line.replace(/\/\/.*$/, '').trim();
            if (!cleanedLine.length) {
                continue;
            }
            //TODO: title syntax
            let openingBracketIndex = this.indexOfSpecialCharacter(cleanedLine, '{');
            if (-1 < openingBracketIndex) {
                if (isInside) {
                    this.log('parse error: opening a new question while previous one is not close.');
                }
                isInside = true;
            }
            currentQuestionCode += ' ' + cleanedLine;
            let closingBracketIndex = this.indexOfSpecialCharacter(cleanedLine, '}');
            if (-1 < closingBracketIndex) {
                if (!isInside) {
                    this.log('parse error: closing a question while none is opened.');
                }
                let question = this.parseQuestion(currentQuestionCode);
                question.id = 'Q' + questionCollection.length;
                questionCollection.push(question);
                questionIdMap[question.id] = question;
                currentQuestionCode = '';
                isInside = false;
            }
        }

        this.questionCollection = questionCollection;
        this.questionIdMap = questionIdMap;

        return this;
    }

    parseQuestion(code) {
        let openingBracketIndex = this.indexOfSpecialCharacter(code, '{');
        let closingBracketIndex = this.indexOfSpecialCharacter(code, '}');

        let question = code.substring(0, openingBracketIndex).trim();
        let answersCode = code.substring(openingBracketIndex + 1, closingBracketIndex).trim();

        // True/False
        if (this.inArray(answersCode, ['T', 'F'])) {
            return {
                type: this.constructor.trueFalse,
                //TODO: title:
                question: question,
                answer: 'T' === answersCode
            };
        }

        // Matching
        if (-1 < answersCode.indexOf(' -> ')) {
            let answerParts = answersCode.split(/([~=])/);
            let answers = [];
            for (const part of answerParts) {
                if ('' === part) {
                    continue;
                }
                if (this.inArray(part, ['=', '~'])) {
                    if ('~' === part) {
                        this.log('parse error: there is no wrong answer in matching question type.')
                    }
                    continue;
                }
                answers.push(part.split(' -> '));
            }
            return {
                type: this.constructor.matching,
                question: question,
                answers: answers
            }
        }

        //TODO: other question types

        // Multiple Choice
        let answers = [];
        let answerParts = answersCode.split(/([~=])/);
        let isRightAnswer = null;
        for (const part of answerParts) {
            if ('' === part) {
                continue;
            }
            //TODO: Scoring
            if (this.inArray(part, ['=', '~'])) {
                isRightAnswer = '=' === part;
                continue;
            }
            if (null === isRightAnswer) {
                this.log('parse error: answer is not right nor false');
            }
            answers.push({
                isRight: isRightAnswer,
                proposal: part
            });
        }
        return {
            type: this.constructor.choice,
            question: question,
            answers: answers,
        };
    }

    indexOfSpecialCharacter(line, character, index = 0) {
        let indexOf = line.indexOf(character, index);
        if (0 < indexOf) {
            if ('\\' === line[indexOf - 1]) {
                indexOf = this.indexOfSpecialCharacter(line, character, indexOf + 1);
            }
        }
        return indexOf;
    }

    inArray(what, array) {
        return -1 < $.inArray(what, array);
    }

    render() {
        let questions = this.questionCollection;
        if (this.options.randomize) {
            questions = questions.shuffle();
        }
        if (Number.isInteger(this.options.subset)) {
            questions = questions.slice(0, this.options.subset);
        }
        let questionElements = [];
        for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
            let question = questions[questionIndex];
            let questionContainerElement = $('<legend>').text(question.question).appendTo($('<fieldset id="' + question.id + '" class="' + question.type + '">')).parent();
            switch (question.type) {
                case this.constructor.trueFalse: {
                    questionContainerElement.append($('<label><input type="radio" name="' + question.id + '" value="true"> True</label>'));
                    questionContainerElement.append($('<label><input type="radio" name="' + question.id + '" value="false"> False</label>'));
                }
                    break;
                case this.constructor.choice: {
                    //TODO
                }
                    break;
                case this.constructor.matching: {
                    //TODO
                }
                    break;
                default:
                    this.log('runtime error: unknown question type: '.question.type);
            }
            $('<button type="submit" data-question-id="' + question.id + '" data-question-index="' + questionIndex + '">Submit</button>').hide().appendTo(questionContainerElement);
            questionElements.push(questionContainerElement);
        }
        this.container.append(questionElements);
        this.attachEventHandlers();
        this.startTime = new Date();
    }

    attachEventHandlers() {
        $('input[type="radio"]').click(function (event) {
            $(this).closest('fieldset').find('button').show();
        });
        $('button').each(function (index, element) {
            $(element).data('gift', this).click(function (event) {
                event.preventDefault();
                $(this).data('gift').submit($(this).data('question-id'), $(this).data('question-index'));
            })
        }.bind(this));
    }

    submit(questionId, questionIndex) {
        let question = this.questionIdMap[questionId];
        let questionContainerElement = $('#' + questionId);
        let keyPrefix = 'cmi.interactions.' + questionIndex + '.';
        let data = {
            id: question.id,
            type: question.type
        };
        switch (question.type) {
            case this.constructor.trueFalse: {
                data['result'] = 'unanticipated';
                let correctResponse = data['correct_responses.0.pattern'] = question.answer ? 'true' : 'false';
                let studentResponse = data['student_response'] = questionContainerElement.find('input:checked').val();
                if (this.inArray(studentResponse, ['true', 'false'])) {
                    data['result'] = correctResponse === studentResponse ? 'correct' : 'wrong';
                }
            }
                break;
            case this.constructor.choice: {
                //TODO
            }
                break;
            case this.constructor.matching: {
                //TODO
            }
                break;
            default:
                this.log('runtime error: unknown question type: '.question.type);
        }
        let prefixedData = {};
        for (const key in data) {
            prefixedData[keyPrefix + key] = data[key];
        }
        console.log(prefixedData);
    }

    log(msg) {
        if (this.options.debug) {
            console.log(msg);
        }
    }

    static trueFalse = 'true-false';
    static choice = 'choice';
    static matching = 'matching';
    //TODO: other question types
}
