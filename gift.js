// Docs:
// - https://docs.moodle.org/en/GIFT_format
// - SCORM 1.2 Specification available at https://adlnet.gov/projects/scorm/#scorm-12

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
                cleanedLine = line.replace(/(?<!https?:)\/\/.*$/, '').trim();
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
                let question = GiftQuestion.parse(currentQuestionCode);
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
        $('pre code').each(function(index, element) {
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
            this.submit(this.options.Plugin.constructor.timeOutExit);
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

        let scorePercent = Math.max(0, Math.min(Math.round(100 * score), 100));
        let feedback = scorePercent + '% ' + (passed ? '≥' : '<') + ' ' + configScores.percent;
        $('<div class="feedback ' + (passed ? 'passed' : 'failed') + '">').text(feedback).insertAfter(this.options.testSubmitButton);
        $(this.options.testSubmitButton).remove();

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
