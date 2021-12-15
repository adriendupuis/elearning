// Docs:
// - SCORM 1.2 Specification available at https://adlnet.gov/projects/scorm/#scorm-12

class ScormGift extends GiftPlugin {
    debug = false;

    setDebug(debug) {
        pipwerks.debug.isActive = this.debug = debug;
    }

    init() {
        pipwerks.SCORM.init();
        this.checkLessonModeAndStatus();
        this.initialiazed = true;
    }

    checkLessonModeAndStatus() {
        let errorMessage = null;
        let lessonMode = pipwerks.SCORM.get('cmi.core.lesson_mode');
        switch (lessonMode) {
            case 'browse':
                errorMessage = 'Test can not be previewed.';
                break;
            case 'review':
                errorMessage = 'Test can not be reviewed.';
                break;
            case 'normal':
            default:
                let completionStatus = pipwerks.SCORM.data.completionStatus;
                if (!pipwerks.SCORM.handleCompletionStatus) {
                    completionStatus = pipwerks.SCORM.get('cmi.core.lesson_status');
                }
                switch (completionStatus) {
                    case 'passed':
                    case 'completed':
                    case 'failed':
                        errorMessage = 'Test as already been attempted and can not be reviewed.';
                        break;
                    case 'incomplete':
                    //TODO: Test can't be suspended. What to do is test as been interrupted? If the browser window just has been reloaded?
                    case 'browsed':
                    case 'not attempted':
                    default:
                }
        }
        if (null !== errorMessage) {
            throw new Error(errorMessage);
        }
    }

    getMasteryScore() {
        return pipwerks.SCORM.get('cmi.student_data.mastery_score');
    }

    run() {
        ScormUtils.startTime = new Date()
        ScormUtils.multipleSetAndSave({
            'cmi.core.exit': ScormUtils.suspendExit
        });
    }

    submit(test, exitType) {
        let testData = {}, score = 0;
        $.each(test.questions, function (questionIndex, question) {
            let keyPrefix = 'cmi.interactions.' + questionIndex + '.';
            let questionData = {
                id: question.getId(),
                type: question.getType(),
                time: ScormUtils.getCmiTime(question.getStartTime()),
                latency: ScormUtils.getCmiTimespan(question.getLatency()),
                weighting: question.getWeight(),
                'correct_responses.0.pattern': question.getCorrectResponse().join(','),
                student_response: question.getStudentResponse().join(','),
                result: question.getResult()
            };
            if ('2004' === pipwerks.SCORM.version) {
                questionData.description = question.getText();// SCORM 2004 2nd Edition
            }

            for (const key in questionData) {
                testData[keyPrefix + key] = questionData[key];
            }

            score += question.getScore();
        });

        testData['cmi.core.score.min'] = 0;
        testData['cmi.core.score.max'] = 100;
        testData['cmi.core.score.raw'] = Math.max(0, Math.min(100 * test.score, 100));

        testData['cmi.core.lesson_status'] = test.passed ? ScormUtils.passedStatus : ScormUtils.failedStatus;
        testData['cmi.core.session_time'] = ScormUtils.getCmiTimespan(new Date().getTime() - ScormUtils.startTime.getTime());
        testData['cmi.core.exit'] = exitType;

        if (this.debug) {
            console.log(testData);
        }
        ScormUtils.multipleSetAndSave(testData);
    }

    static normalExit = ScormUtils.normalExit;
    static timeOutExit = ScormUtils.timeOutExit;
}
