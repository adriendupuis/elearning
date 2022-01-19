/* Overrides few Cmi5 and CourseCmi5Plugin methods */

Cmi5.prototype.__setEndpoint = Cmi5.prototype.setEndpoint;
Cmi5.prototype.setEndpoint = function (endpoint) {
    // Remove trailing slash to avoid 404 when adding sub-path starting with one.
    this.__setEndpoint(endpoint.replace(/\/$/, ''));
};

Cmi5.prototype.__sendStatement = Cmi5.prototype.sendStatement;
Cmi5.prototype.sendStatement = async function (st) {
    try {
        await this.__sendStatement(st);
    } catch (ex) {
        // Avoid error on 200 instead of 204 but re-throw other errors.
        if (ex.message !== 'Failed to send statement: status code 200') {
            throw ex;
        }
    }
};
Cmi5.prototype.__sendStatements = Cmi5.prototype.sendStatements;
Cmi5.prototype.sendStatements = async function (sts) {
    try {
        await this.__sendStatements(sts);
    } catch (ex) {
        // Avoid error on 200 instead of 204 but re-throw other errors.
        if (ex.message !== 'Failed to send statements: status code 200') {
            throw ex;
        }
    }
};

CourseCmi5Plugin.prototype.__setActivityState = CourseCmi5Plugin.prototype.setActivityState;
CourseCmi5Plugin.prototype.setActivityState = async function (stateId, data) {
    try {
        return await this.__setActivityState(stateId, data);
    } catch (ex) {
        // Avoid error on setter empty response but re-throw other errors.
        if (-1 === ex.message.toString().indexOf('Unexpected end of JSON input')) {
            throw ex;
        }
    }
};

// Extend suspend data usage to more than bookmark
CourseCmi5Plugin.prototype.getSuspendData = function () {
    return this.getActivityState(SUSPEND_DATA_KEY).then(suspendDataObj => {
        if (suspendDataObj) {
            return Promise.resolve(suspendDataObj);
        } else {
            return Promise.resolve('');
        }
    });
};
CourseCmi5Plugin.prototype.setSuspendData = function (suspendData) {
    return this.setActivityState(SUSPEND_DATA_KEY, suspendData);
};
CourseCmi5Plugin.prototype.setBookmark = function (bookmark) {
    // Concat bookmark with other suspend data instead of overriding.
    this.getSuspendData().then(suspendData => {
        suspendData.bookmark = bookmark;
        return this.setSuspendData(suspendData);
    });
};

/* Add few Cmi5 or CourseCmi5Plugin methods */

// Add a CourseCmi5Plugin.completed method like CourseCmi5Plugin.experienced
if ('undefined' === typeof CourseCmi5Plugin.prototype.completed) {
    CourseCmi5Plugin.prototype.completed = function (additionalProperties) {
        this.cmi5.completed(additionalProperties);
    };
}
