let ScormUtils = {
    previousData: [],
    set: function (key, data) {
        if ('object' == typeof data) {
            data = JSON.stringify(data);
        }
        if (data !== this.previousData[key]) {
            pipwerks.SCORM.set('cmi.suspend_data', data);
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
            'cmi.core.lesson_status': 'completed',
            'cmi.core.exit': ''
        });
        pipwerks.SCORM.quit();
    }
};