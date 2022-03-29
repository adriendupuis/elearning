class Cmi5Gift extends GiftPlugin {
    debug = false;
    cmi5Plugin;

    setDebug(debug) {
        this.debug = debug;
        if (this.debug) {
            Cmi5.enableDebug();
        }
    }

    init() {
        this.cmi5Plugin = new CourseCmi5Plugin();
        this.cmi5Plugin.initialize(function () {
            this.initialized = true;
        }.bind(this), function (result, error, activeStatementCount) {
            //console.log('callbackOnStatementSend', result, error, activeStatementCount);
        });
    }

    getMasteryScore() {
        //return this.cmi5Plugin.cmi5._lmsLaunchData.masteryScore;
        return this.cmi5Plugin.cmi5.getMasteryScore();
    }

    run() {
        //TODO: session time?
    }

    submit(test, exitType) {
        // "type": "http://adlnet.gov/expapi/activities/cmi.interaction",

        let interactionList = [];
        $.each(test.questions, function (questionIndex, question) {
            let interactionObj = {
                userAnswers: question.getStudentResponse(),
                correctAnswers: question.getCorrectResponse(),
                success: question.getResult(),//TODO: format?
                testId: test.id,
                interactionId: question.getId(),
                interactionType: question.getType(),//TODO: transform into cmi5 vocabulary?
                name: question.getTitle(),
                description: question.getText()
            };
            if (question instanceof ChoiceQuestion) {
                interactionObj.choices = [];
                $.each(question.responses, function (responseIndex, response) {
                    interactionObj.choices.push({
                        id: response.index,
                        description: {'en-US': response.text}
                    })
                });
            }
            interactionList.push(interactionObj);
        });
        this.cmi5Plugin.captureInteractions(interactionList);
        let userScoreObj = {
            scaled: test.score,
            raw: Math.max(0, Math.min(Math.round(100 * test.score), 100)),
            min: 0,
            max: 100
        };
        if (test.passed) {
            this.cmi5Plugin.passAndComplete(userScoreObj);
        } else {
            this.cmi5Plugin.fail(userScoreObj);
        }
    }
}