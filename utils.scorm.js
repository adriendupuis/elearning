let ScormUtils = {
    // Store
    previousData: [],
    startTime: new Date(),
    set: function (key, data) {
        if ('object' == typeof data) {
            data = JSON.stringify(data);
        }
        if (data !== this.previousData[key]) {
            pipwerks.SCORM.set(key, data);
            this.previousData[key] = data;
            return true;
        }
        return false;
    },
    multipleSetAndSave: function (datas) {
        let hasChanged = false;
        for (const key in datas) {
            hasChanged = hasChanged || this.set(key, datas[key]);
        }
        if (hasChanged) {
            pipwerks.SCORM.save();
        }
    },
    complete: function () {
        this.multipleSetAndSave({
            'cmi.core.session_time': this.getCmiTimespan(new Date().getTime() - this.startTime.getTime()),
            'cmi.core.lesson_status': 'completed',
            'cmi.core.exit': ''
        });
        pipwerks.SCORM.quit();
    },

    // Format
    getCmiTime: function (date= new Date()) {
        let hours = date.getHours();
        hours = hours < 10 ? '0' + hours : hours;
        let minutes = date.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let seconds = date.getSeconds();
        seconds = seconds < 10 ? '0' + seconds : seconds;
        let hundredths = Math.round(date.getMilliseconds() / 100)
        hundredths = seconds == 0 ? '00' : (hundredths < 10 ? '0' + hundredths : hundredths);
        return hours + ':' + minutes + ':' + seconds + '.' + hundredths;
    },
    getCmiTimespan: function (milliseconds) {
        let remainingMinutes = milliseconds % (60 * 60 * 1000);
        let hours = (milliseconds - remainingMinutes) / (60 * 60 * 1000);
        hours = '' + hours;
        while (hours.length < 4) {
            hours = '0' + hours;
        }
        let remainingSeconds = milliseconds % (60 * 1000);
        let minutes = (remainingMinutes - remainingSeconds) / (60 * 1000);
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let seconds = remainingSeconds / 1000;
        seconds = Math.round(seconds * 100) / 100;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        return hours + ':' + minutes + ':' + seconds;
    }
};