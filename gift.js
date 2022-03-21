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
            Plugin: null,
            slideSelector: '.reveal > .slides > section',
            questionSlideClass: 'test',
            questionSlideSelector: null,
            testSubmitButton: 'section button',
            testTime: null,
            timerContainer: '.timer',
            timerWarningRatio: 1 / 6,
            passingScore: '100%',
            parseOnlyStandardComment: false
        }, options);
        this.options.Plugin.setDebug(this.options.debug);
        if ('undefined' === typeof this.options.questionSlideSelector || null === this.options.questionSlideSelector) {
            this.options.questionSlideSelector = this.options.slideSelector + '.' + this.options.questionSlideClass;
        }

        this.questionIdMap = {};
        this.questionPool = [];
        this.questions = [];
        this.testStartTime = null;
        this.testTimerId = null;
        this.firstTestSlideIndex = null;
        this.submitted = false;//Ask to the LMS

        let warningMessage = null;
        if (null !== this.options.Plugin && 'function' === typeof this.options.Plugin.init) {
            try {
                this.options.Plugin.init();
            } catch (e) {
                warningMessage = e.message;
            }
        }
        if (null !== warningMessage) {
            this.getSubmitButton().hide();
            $('<section class="warning">').text(warningMessage).insertBefore(this.getSubmitSlide());
            this.options.Reveal.sync();
            this.options.Reveal.slide(0, 0);
        } else {
            this.load(url);
        }
    }

    load(url) {
        $.ajax({
            url: url,
            success: this.parseAndRun.bind(this),
            error: function (jqXHR, textStatus, errorThrown) {
                this.log('resource error: ' + errorThrown);
            }.bind(this),
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

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            let line = lines[lineIndex];
            let cleanedLine = line;
            //remove comments and white spaces
            if (this.options.parseOnlyStandardComment) {
                cleanedLine = line.replace(/^\/\/.*$/, '').trim();
            } else {
                cleanedLine = line.replace(/(?<!https?\\?:)\/\/.*$/, '').trim();
            }
            if (!cleanedLine.length) {
                continue;
            }

            let openingBracketIndex = GiftQuestion.indexOfSpecialCharacter(cleanedLine, '{');
            if (-1 < openingBracketIndex) {
                if (isInside) {
                    this.log('parse error @' + (lineIndex + 1) + ': opening a new question while previous one is not closed.');
                    cleanedLine = cleanedLine.slice(0, openingBracketIndex) + cleanedLine.slice(openingBracketIndex + 1);
                }
                isInside = true;
            }
            currentQuestionCode += "\n" + cleanedLine;
            let closingBracketIndex = GiftQuestion.indexOfSpecialCharacter(cleanedLine, '}');
            if (-1 < closingBracketIndex) {
                if (!isInside) {
                    this.log('parse error @' + (lineIndex + 1) + ': closing a question while none is opened.');
                    currentQuestionCode = currentQuestionCode.split("\n").slice(0, -1).join("\n");
                    cleanedLine = cleanedLine.slice(0, closingBracketIndex) + cleanedLine.slice(closingBracketIndex + 1);
                    currentQuestionCode += "\n" + cleanedLine;
                    continue;
                }
                let question = GiftQuestion.parse(currentQuestionCode, this.options.debug);
                question.setIndex(questionPool.length);
                //TODO: create ID from title when cmi5
                if ('undefined' !== typeof ScormUtils && question.getTitle() && !question.getId()) {
                    if (ScormUtils.isCmiIdentifier(question.getTitle())) {
                        question.setId(question.getTitle());
                    } else {
                        this.log('parse notice: following title is modified to be used as a CMIIdentifier: "' + question.getTitle() + '"');
                        question.setId(ScormUtils.formatToCmiIdentifier(question.getTitle()));
                        this.log('parse notice: …and becomes the following CMIIdentifier: "' + question.getId() + '"');
                    }
                }
                if (!question.getId()) {
                    question.setId('Q' + question.getIndex());
                }
                while ('undefined' !== questionIdMap[question.id] && questionIdMap[question.id]) {
                    this.log('parse error @' + (lineIndex + 1) + ': duplicate id: "' + question.id + '"');
                    question.setId(question.getId() + '_');

                }
                questionPool.push(question);
                questionIdMap[question.getId()] = question;
                //Reinitialization
                currentQuestionCode = '';
                isInside = false;
            }
        }

        this.questionPool = questionPool;
        this.questionIdMap = questionIdMap;

        return this;
    }

    selectQuestions() {
        let questions = this.questionPool;
        if (this.options.randomize) {
            questions = questions.shuffle();
        }
        if (Number.isInteger(this.options.subset)) {
            questions = questions.slice(0, this.options.subset);
            if (this.options.subset > this.questionPool.length) {
                this.log('config warning: question subset count is higher than available question count.');
            }
        } else if (null !== this.options.subset) {
            this.log('config error: question subset count is not an integer.');
        }
        this.questions = questions;

        return this;
    }

    render() {
        let submitSlide = this.getSubmitSlide();
        for (let questionIndex = 0; questionIndex < this.questions.length; questionIndex++) {
            let question = this.questions[questionIndex];
            let questionContainerElement = $('<legend>').html(question.text).appendTo($('<fieldset id="' + question.getId() + '" class="question ' + question.getType() + '">')).parent();
            question.render(questionContainerElement);
            $('<section class="' + this.options.questionSlideClass + '">').append(questionContainerElement).insertBefore(submitSlide);
        }

        let hlPlug = this.options.Reveal.getPlugin('highlight');
        hlPlug.init(this.options.Reveal);
        $('pre code').each(function (index, element) {
            $(element).text($(element).text().replace(/<br>/g, "\n").trim());
            let language = $(element).attr('class');
            if (language && hlPlug.hljs.getLanguage(language)) {
                hlPlug.highlightBlock(element, language);
            }
        }.bind(this));

        this.options.Reveal.sync();
        this.options.Reveal.slide(0, 0);
        $(this.options.slideSelector).each(function () {
            let zoom = 1.0;
            while ($(this).height() > $('body').height() && zoom > 0.35) {
                zoom -= 0.05;
                $(this).css('zoom', zoom);
            }
        });

        this.firstTestSlideIndex = $(this.options.slideSelector).index($(this.options.questionSlideSelector));

        return this;
    }

    attachEventHandlers() {
        $('[type="radio"], [type="checkbox"]').click(function () {
            $(this).blur();
        })
        $(this.options.testSubmitButton).click(function (event) {
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
                let currentQuestion = this.questionIdMap[currentSlide.find('.question').attr('id')];
                currentQuestion.start();
            }
            let previousSlide = $(event.previousSlide);
            if (previousSlide.is(this.options.questionSlideSelector)) {
                let previousQuestion = this.questionIdMap[previousSlide.find('.question').attr('id')];
                previousQuestion.stop();
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
            $(this.options.timerContainer).hide();
            this.submit(this.options.Plugin.constructor.timeOutExit);
        } else if (timeLeft / this.options.testTime < this.options.timerWarningRatio) {
            $(this.options.timerContainer).addClass('warning');
        }
    }

    run() {
        if (this.options.Plugin && this.options.Plugin.run) {
            this.options.Plugin.run();
        }

        return this;
    }

    submit(exit = this.options.Plugin.constructor.normalExit) {
        $(this.options.testSubmitButton).hide();
        if (exit !== this.options.Plugin.constructor.normalExit) {
            let indices = this.options.Reveal.getIndices(this.getSubmitSlide()[0]);
            this.options.Reveal.slide(indices.h, indices.v);
        }
        clearInterval(this.testTimerId);
        if (this.submitted) {
            this.log('runtime error: submitted more than once');
            return this;
        }
        this.submitted = true;

        let score = 0, weight = 0;
        $.each(this.questions, function (questionIndex, question) {
            score += question.getWeight() * question.getScore();
            weight += question.getWeight();
        }.bind(this));
        score /= weight;
        let configScores = this.getConfigurationScores();
        let passed = score >= configScores.passing;

        this.options.Plugin.submit({
            id: 'GIFT',
            questions: this.questions,
            score: score,
            passed: passed
        }, exit);

        let feedback = '';
        let scorePercent = Math.max(0, Math.min(Math.round(100 * score), 100));
        if (exit === this.options.Plugin.constructor.timeOutExit) {
            let minutes = Math.floor(this.options.testTime / 60),
                seconds = this.options.testTime - 60 * minutes,
                minutesStr = minutes ? minutes + '&nbsp;minute' + (1 < minutes ? 's' : '') : '',
                secondsStr = seconds ? seconds + '&nbsp;second' + (1 < seconds ? 's' : '') : '',
                timeStr = minutesStr;
            if (minutesStr && secondsStr) {
                timeStr += ' ' + secondsStr;
            } else if (secondsStr) {
                timeStr = secondsStr;
            }
            feedback = 'Time Out<br>' + timeStr + ' allotted time has elapsed';
            $('<div class="feedback timeout">').html(feedback).insertAfter(this.options.testSubmitButton);
        }
        feedback = scorePercent + '% ' + (passed ? '≥' : '<') + ' ' + configScores.percent + '<br>' + (passed ? 'Passed' : 'Failed');
        $('<div class="feedback ' + (passed ? 'passed' : 'failed') + '">').html(feedback).insertAfter(this.options.testSubmitButton);
        //$(this.options.testSubmitButton).remove();

        return this;
    }

    getSubmitButton() {
        return $(this.options.testSubmitButton);
    }

    getSubmitSlide() {
        return this.getSubmitButton().closest(this.options.slideSelector);
    }

    getConfigurationScores() {
        let passingConf = this.options.passingScore;
        let passingScore = null;// 0 - 1
        let passingPercent = null;// 0% - 100%

        // The score threshold hard coded into the package could be override live from LMS
        let masteryScore = this.options.Plugin.getMasteryScore();
        if (masteryScore && 'null' !== masteryScore) {
            //TODO: Exact format?
            //TODO: SCORM vs cmi5
            passingConf = masteryScore + '%';
        }

        if ('number' === typeof passingConf || passingConf === '' + parseFloat(passingConf)) {
            passingScore = parseFloat(passingConf);
            passingPercent = Math.round(100 * passingScore) + '%';
        } else if ('string' === typeof passingConf && '%' === passingConf.slice(-1)) {
            passingScore = parseFloat(passingConf) / 100;
            passingPercent = passingConf;
        }

        return {
            'percent': passingPercent,
            'passing': passingScore,
            'max': 1,
            'min': 0
        };
    }

    log(msg) {
        if (this.options.debug) {
            console.log(msg);
        }
    }
}

class GiftPlugin {
    static normalExit = 'normal';
    static timeOutExit = 'timeout';

    setDebug(debug) {
    }

    init() {
    }

    getMasteryScore() {
        throw new Error('Not yet implemented');
    }

    run() {
        throw new Error('Not yet implemented');
    }

    submit(test, exitType) {
        throw new Error('Not yet implemented');
    }
}

class Question {
    type = null;
    index = null;
    id = null;
    title = null;
    text = null;
    responses = [];
    weight = 1;
    lastTime = null;
    stopTime = null;
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

    render(questionContainerElement = null) {
        if (questionContainerElement) {
            this.setElement(questionContainerElement);
        }
        throw new Error('Not yet implemented at typed question level');
    }

    getElement() {
        if (null === this.element) {
            this.setElement('#' + this.getId());
        }
        return this.element;
    }

    setElement(element) {
        this.element = $(element);
    }

    start() {
        if (null === this.lastTime) {
            this.lastTime = new Date();
        }
        return this;
    }

    stop() {
        this.stopTime = new Date();
        this.latency = this.stopTime.getTime() - this.lastTime.getTime();
        this.lastTime = null;
        return this;
    }

    getStopTime() {
        return this.stopTime;
    }

    getLatency() {
        return this.latency;
    }

    setCorrection(cached = true) {
        throw new Error('Not yet implemented at typed question level');
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
    static parse(code, debug = false) {
        let titleRegExp = /::([^:]+)::\n?/;

        let openingBracketIndex = GiftQuestion.indexOfSpecialCharacter(code, '{');
        let closingBracketIndex = GiftQuestion.indexOfSpecialCharacter(code, '}');

        let text = code.substring(0, openingBracketIndex);
        let title = null, titleMatch = titleRegExp.exec(text);
        let id = null;
        if (null !== titleMatch) {
            title = this.formatText(titleMatch[1]);
            text = text.replace(titleRegExp, '');
        }
        text = this.formatText(text);

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
                    if (debug && '~' === part) {
                        console.log('parse error: there is no wrong response in matching question type.')
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
            if (debug && null === isCorrectResponse) {
                console.log('parse error: response is not correct nor wrong');
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
        return code.replace(/\\([~=#{}:])/g, '$1');
    }

    static addNewLines(code) {
        return code.replace(/\\n/g, "\n").replace(/\n/g, '<br>');
    }
}

class TrueFalseQuestion extends Question {
    type = 'true-false';

    render(questionContainerElement = null) {
        if (questionContainerElement) {
            this.setElement(questionContainerElement);
        }
        this.getElement().append($('<label><input type="radio" name="' + this.getId() + '" value="true"> True</label>'));
        this.getElement().append($('<label><input type="radio" name="' + this.getId() + '" value="false"> False</label>'));
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

    render(questionContainerElement = null) {
        if (questionContainerElement) {
            this.setElement(questionContainerElement);
        }
        let list = $('<ul>');
        $.each(this.getResponses().shuffle(), function (index, response) {
            list.append($('<li><label><input type="checkbox" name="' + this.getId() + '" value="' + response.hash + '"> ' + response.text + '</label></li>'));
        }.bind(this));
        list.appendTo(this.getElement());
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

    render(questionContainerElement = null) {
        if (questionContainerElement) {
            this.setElement(questionContainerElement);
        }
        let list = $('<ul>');
        $.each(this.responses.shuffle(), function (index, response) {
            list.append($('<li>' + response[0] + '</li>'));
        });
        list.appendTo(this.getElement()).sortable();
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

    render(questionContainerElement = null) {
        if (questionContainerElement) {
            this.setElement(questionContainerElement);
        }
        $.each(this.responses.shuffle(), function (index, response) {
            questionContainerElement.append($('<div class="matching-source">' + response[0] + '&nbsp;<span class="handle"></span></div>'));
        });
        $.each(this.responses.shuffle().shuffle(), function (index, response) {
            questionContainerElement.append($('<div class="matching-target"><span class="handle"></span> ' + response[1] + '</div>'));
        });
        questionContainerElement.matching().disableSelection();
    }

    setCorrection(cached) {
        if (null === this.studentCorrectResponseCount || false === cached) {
            let studentCorrectResponseCount = 0;
            let studentWrongResponseCount = 0;
            let studentResponse = [];
            let correctResponse = [];

            $.each(this.getResponses(), function (index) {
                correctResponse.push(index.toString() + '.' + index.toString());
            });

            $.each(this.getElement().matching('getMatches'), function (index, match) {
                let sourceIndex = null, targetIndex = null;
                $.each(this.getResponses(), function (index, response) {
                    if ($(match[0]).text().trim() === response[0]) {
                        sourceIndex = index;
                    }
                    if ($(match[1]).text().trim() === response[1]) {
                        targetIndex = index;
                    }
                    if (null !== sourceIndex && null !== targetIndex) {
                        return false;
                    }
                });
                studentResponse.push(sourceIndex.toString() + '.' + targetIndex.toString())
                if (sourceIndex === targetIndex) {
                    studentCorrectResponseCount++;
                } else {
                    studentWrongResponseCount++;
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
