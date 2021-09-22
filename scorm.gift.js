// Docs:
// - https://docs.moodle.org/en/GIFT_format

class Gift {
    constructor(url, options = {}) {
        this.options = Object.assign({
            debug: false,
            subset: null,
            randomize: false,
            addQuestionTextToId: false,
            Reveal: Reveal,
            slideSelector: '.reveal > .slides > section',
            questionSlideClass: 'test',
            questionSlideSelector: null,
            testSubmitButton: 'section button',
            testTime: null,
            timerContainer: '.timer',
            passingScore: '100%'
        }, options);
        pipwerks.debug.isActive = this.options.debug;
        if ('undefined' === typeof this.options.questionSlideSelector || null === this.options.questionSlideSelector) {
            this.options.questionSlideSelector = this.options.slideSelector + '.' + this.options.questionSlideClass;
        }

        this.questionIdMap = {};
        this.questionPool = [];
        this.questions = [];
        this.sessionStartTime = null;
        this.testStartTime = null;
        this.testTimerId = null;
        this.firstTestSlideIndex = null;
        this.submitted = false;//Ask to the LMS

        this.load(url);
    }

    load(url) {
        $.ajax({
            url: url,
            success: this.parseAndRun.bind(this),
            dataType: 'text'
        });
    }

    parseAndRun(data) {
        if (!this.options.debug) {
            if ('undefined' === typeof atob) {
                this.log('runtime error: unsupported browser.');
                return;
            }
            data = atob(data);
        }
        this.parseQuestionPool(data)
            .selectQuestions()
            .render()
            .attachEventHandlers()
            .run();
    }

    parseQuestionPool(data) {
        let lines = data.split("\n");
        let questionIdMap = {};
        let questionPool = [];
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
                question.id = 'Q' + questionPool.length;
                questionPool.push(question);
                questionIdMap[question.id] = question;
                currentQuestionCode = '';
                isInside = false;
            }
        }

        this.questionPool = questionPool;
        this.questionIdMap = questionIdMap;

        return this;
    }

    parseQuestion(code) {
        let openingBracketIndex = this.indexOfSpecialCharacter(code, '{');
        let closingBracketIndex = this.indexOfSpecialCharacter(code, '}');

        let question = code.substring(0, openingBracketIndex).trim();
        let responsesCode = code.substring(openingBracketIndex + 1, closingBracketIndex).trim();

        // True/False
        if (this.inArray(responsesCode, ['T', 'F'])) {
            return {
                type: this.constructor.trueFalseType,
                //TODO: title:
                text: question,
                response: 'T' === responsesCode
            };
        }

        // Matching
        if (-1 < responsesCode.indexOf(' -> ')) {
            let responseParts = responsesCode.split(/([~=])/);
            let responses = [];
            for (const part of responseParts) {
                if ('' === part) {
                    continue;
                }
                if (this.inArray(part, ['=', '~'])) {
                    if ('~' === part) {
                        this.log('parse error: there is no wrong response in matching question type.')
                    }
                    continue;
                }
                responses.push(part.split(' -> '));
            }
            return {
                type: this.constructor.matchingType,
                text: question,
                responses: responses
            }
        }

        //TODO: other question types

        // Multiple Choice
        let responses = [];
        let responseParts = responsesCode.split(/([~=])/);
        let isCorrectResponse = null;
        for (const part of responseParts) {
            if ('' === part) {
                continue;
            }
            if (this.inArray(part, ['=', '~'])) {
                isCorrectResponse = '=' === part;
                continue;
            }
            if (null === isCorrectResponse) {
                this.log('parse error: response is not correct nor wrong');
            }
            responses.push({
                isCorrect: isCorrectResponse,
                text: part
            });
            isCorrectResponse = null;
        }
        return {
            type: this.constructor.choiceType,
            text: question,
            responses: responses,
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

    selectQuestions() {
        let questions = this.questionPool;
        if (this.options.randomize) {
            questions = questions.shuffle();
        }
        if (Number.isInteger(this.options.subset)) {
            questions = questions.slice(0, this.options.subset);
        }
        this.questions = questions;

        return this;
    }

    render() {
        let submitSlide = $(this.options.testSubmitButton).closest(this.options.slideSelector);
        for (let questionIndex = 0; questionIndex < this.questions.length; questionIndex++) {
            let question = this.questions[questionIndex];
            let questionContainerElement = $('<legend>').text(question.text).appendTo($('<fieldset id="' + question.id + '" class="question ' + question.type + '">')).parent();
            switch (question.type) {
                case this.constructor.trueFalseType: {
                    questionContainerElement.append($('<label><input type="radio" name="' + question.id + '" value="true"> True</label>'));
                    questionContainerElement.append($('<label><input type="radio" name="' + question.id + '" value="false"> False</label>'));
                }
                    break;
                case this.constructor.choiceType: {
                    $.each(question.responses, function(index, response) {
                        questionContainerElement.append($('<label><input type="checkbox" name="' + question.id + '" value="'+index+'"> '+response.text+'</label>'));
                    });
                }
                    break;
                case this.constructor.matchingType: {
                    //TODO
                }
                    break;
                default:
                    this.log('runtime error: unknown question type: '.question.type);
            }
            $('<section class="' + this.options.questionSlideClass + '">').append(questionContainerElement).insertBefore(submitSlide);
        }
        this.options.Reveal.sync();
        this.options.Reveal.slide(0, 0);

        this.firstTestSlideIndex = $(this.options.slideSelector).index($(this.options.questionSlideSelector));

        return this;
    }

    attachEventHandlers() {
        $('[type="radio"], [type="checkbox"]').click(function () {
            $(this).blur();
        })
        $('button').click(function (event) {
            event.preventDefault();
            this.submit();
        }.bind(this));
        this.options.Reveal.addEventListener('slidechanged', function (event) {
            let currentSlide = $(event.currentSlide);
            if (currentSlide.is(this.options.questionSlideSelector)) {
                if (null !== this.options.testTime && null === this.testTimerId) {
                    $(this.options.timerContainer).show();
                    this.testStartTime = new Date();
                    this.runTestTimer();
                    this.testTimerId = setInterval(this.runTestTimer.bind(this), 1000);
                }
                currentSlide.data('start-time', new Date());
            }
            let previousSlide = $(event.previousSlide);
            if (previousSlide.is(this.options.questionSlideSelector)) {
                let latency = new Date().getTime() - previousSlide.data('start-time').getTime();
                if (previousSlide.data('latency')) {
                    latency += previousSlide.data('latency');
                }
                previousSlide.data('latency', latency);
            }
        }.bind(this));

        return this;
    }

    slideNumber(slide) {
        let indices = this.options.Reveal.getIndices(slide);
        if ($(slide).is(this.options.questionSlideSelector)) {
            return ['Q ' + (indices.h + 1 - this.firstTestSlideIndex) + '/' + this.questions.length];
        } else if (0 === indices.h && !$(this.options.Reveal.getCurrentSlide()).is(this.options.questionSlideSelector)) {
            return ['Intro'];
        } else {
            return [indices.h < this.firstTestSlideIndex ? 'Intro' : 'Outro'];
        }
    }

    runTestTimer() {
        let timeSpent = (new Date().getTime() - this.testStartTime.getTime()) / 1000;
        let timeLeft = Math.round(this.options.testTime - timeSpent);

        // Display
        let minutes = (timeLeft - timeLeft % 60) / 60;
        let seconds = timeLeft % 60;
        $(this.options.timerContainer).text((minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds);

        // Handle timeout
        if (0 >= timeLeft) {
            this.submit(this.constructor.timeOutExit);
        }
    }

    run() {
        pipwerks.SCORM.init();
        ScormUtils.startTime = this.sessionStartTime = new Date()
        ScormUtils.multipleSetAndSave({
            'cmi.core.exit': this.constructor.suspendExit
        });

        return this;
    }

    submit(exit = this.constructor.normalExit) {
        $(this.options.testSubmitButton).hide();
        clearInterval(this.testTimerId);
        if (this.submitted) {
            this.log('runtime error: submitted more than once');
            return this;
        }
        this.submitted = true;

        let configScores = this.getConfigurationScores();
        this.testData = {
            //'cmi.student_data.mastery_score': configScores.passing,// read only
            'cmi.core.score.min': configScores.min,
            'cmi.core.score.max': configScores.max
        };
        let score = 0;
        $(this.options.questionSlideSelector + ' fieldset.question').each(function (questionIndex, questionElement) {
            let questionId = $(questionElement).attr('id');
            let question = this.questionIdMap[questionId];
            let questionContainerElement = $('#' + questionId);
            let questionSlide = questionContainerElement.closest(this.options.questionSlideSelector);
            let keyPrefix = 'cmi.interactions.' + questionIndex + '.';
            let data = {
                id: question.id,
                type: question.type,
                time: ScormUtils.getCmiTime(questionSlide.data('start-time')),
                latency: ScormUtils.getCmiTimespan(questionSlide.data('latency')),
                weighting: 1
            };
            if ('2004' === pipwerks.SCORM.version) {
                data.desscription = question.text;// SCORM 2004 2nd Edition
            } else if (this.options.addQuestionTextToId) {
                data.id = (question.id + question.text.replace(/[^0-9a-zA-Z]/gi, '')).substr(0, 255);// CMIIdentifier
            }
            data.result = this.constructor.neutralResult;
            switch (question.type) {
                case this.constructor.trueFalseType: {
                    let correctResponse = question.response ? 'true' : 'false';
                    data['correct_responses.0.pattern'] = question.response ? '1' : '0';
                    let studentResponse = questionContainerElement.find('input:checked').val();
                    if (this.inArray(studentResponse, ['true', 'false'])) {
                        data.student_response = 'true' === studentResponse ? '1' : '0';
                        data.result = correctResponse === studentResponse ? this.constructor.correctResult : this.constructor.wrongResult;
                        score += correctResponse === studentResponse ? 1 : 0;
                    } else if (studentResponse) {
                        data.result = this.constructor.unanticipatedResult;
                    }
                }
                    break;
                case this.constructor.choiceType: {
                    let correctResponseCount = 0;
                    let studentCorrectResponseCount = 0;
                    let studentWrongResponseCount = 0;
                    let correctResponsePattern = [];
                    let studentResponse = [];
                    $.each(question.responses, function(index, response) {
                        let isStudentResponse = questionContainerElement.find('input[value="'+index+'"]').is(':checked');
                        if (response.isCorrect) {
                            correctResponsePattern.push(index);
                            ++correctResponseCount;
                            if (isStudentResponse) {
                                studentResponse.push(index);
                                ++studentCorrectResponseCount;
                            }
                        } else if (isStudentResponse) {
                            studentResponse.push(index);
                            ++studentWrongResponseCount;
                        }
                    });
                    data['correct_responses.0.pattern'] = correctResponsePattern.join(',');
                    if (0 < studentCorrectResponseCount - studentWrongResponseCount) {
                        data.result = this.constructor.correctResult;
                    } else if (0 > studentCorrectResponseCount - studentWrongResponseCount) {
                        data.result = this.constructor.wrongResult;
                    } else {
                        data.result = this.constructor.neutralResult;
                    }
                    score += Math.max(0, studentCorrectResponseCount - studentWrongResponseCount) / correctResponseCount;
                }
                    break;
                case this.constructor.matchingType: {
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
            Object.assign(this.testData, prefixedData);
        }.bind(this));

        let passed = score >= configScores.passing;

        this.testData['cmi.core.score.raw'] = score;
        this.testData['cmi.core.lesson_status'] = passed ? this.constructor.passedStatus : this.constructor.failedStatus;
        this.log(this.testData);

        ScormUtils.multipleSetAndSave(this.testData);

        let feedback = Math.round(100 * score / configScores.max) + '% ' + (passed ? '≥' : '<') + ' ' + configScores.percent;
        $('<div class="feedback ' + (passed ? 'passed' : 'failed') + '">').text(feedback).insertAfter(this.options.testSubmitButton);
        $(this.options.testSubmitButton).remove();

        return this;
    }

    getConfigurationScores() {
        let passingConf = this.options.passingScore;
        let passingScore = null;
        let passingPercent = null;
        let maxScore = null;

        if (null !== this.options.subset) {
            maxScore = this.options.subset;
        } else {
            maxScore = this.questions.length; // means that this.selectQuestions() must have been already called.
        }

        if ('number' === typeof passingConf || passingConf === '' + parseFloat(passingConf)) {
            passingScore = parseFloat(this.options.passingScore);
            passingPercent = Math.round(100 * passingScore / maxScore) + '%';
        }
        if ('string' === typeof passingConf && '%' === passingConf.slice(-1)) {
            passingScore = maxScore * parseFloat(passingConf) / 100;
            passingPercent = passingConf;
        }

        return {
            'percent': passingPercent,
            'passing': passingScore,
            'max': maxScore,
            'min': 0
        };
    }

    log(msg) {
        if (this.options.debug) {
            console.log(msg);
        }
    }

    //TODO: move to ScormUtils

    static trueFalseType = 'true-false';
    static choiceType = 'choice';
    //static fillInType = 'fill-in'
    static matchingType = 'matching';
    //static performanceType = 'performance';
    //static sequencingType = 'sequencing';
    //static likertType = 'likert';
    //static numericType = 'numeric';

    static correctResult = 'correct';
    static wrongResult = 'wrong';
    static neutralResult = 'neutral';
    static unanticipatedResult = 'unanticipated';

    static passedStatus = 'passed';
    //static completedStatus = 'completed';
    static failedStatus = 'failed';
    //static incompleteStatus = 'incomplete';
    //static browsedStatus = 'browsed';
    //static notAttemptedStatus = 'not attempted';

    static normalExit = '';
    static timeOutExit = 'time-out';
    static suspendExit = 'suspend';
}
