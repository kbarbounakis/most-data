/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2016-07-17.
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 Anthi Oikonomou anthioikonomou@gmail.com
 All rights reserved.
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of MOST Web Framework nor the names of its
 contributors may be used to endorse or promote products derived from
 this software without specific prior written permission.
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @ignore
 */
var util = require("util"),
    conf = require("./data-configuration");

/**
 * @class
 * @constructor
 */
function DataValidator() {
    var context_;
    this.setContext = function(context) {
        context_ = context;
    };
    /**
     * @returns {DataContext|*}
     */
    this.getContext = function() {
        return context_;
    };
}

function zeroPad_(number, length) {
    number = number || 0;
    var res = number.toString();
    while (res.length < length) {
        res = '0' + res;
    }
    return res;
}

/**
 * @class
 * @param {string} pattern
 * @augments {DataValidator}
 * @constructor
 */
function PatternValidator(pattern) {
    this.pattern = pattern;
    PatternValidator.super_.call(this);
}
util.inherits(PatternValidator, DataValidator);
/**
 * Validates the given value and returns a validation result or undefined if the specified value is invalid
 * @param val
 * @returns {{code: string, message: string, innerMessage: *}|undefined}
 */
PatternValidator.prototype.validateSync = function(val) {
    if (typeof val === 'undefined' || val == null) {
        return;
    }
    var valueTo = val;
    if (val instanceof Date) {
        var year   = val.getFullYear();
        var month  = zeroPad_(val.getMonth() + 1, 2);
        var day    = zeroPad_(val.getDate(), 2);
        var hour   = zeroPad_(val.getHours(), 2);
        var minute = zeroPad_(val.getMinutes(), 2);
        var second = zeroPad_(val.getSeconds(), 2);
        var millisecond = zeroPad_(val.getMilliseconds(), 3);
        //format timezone
        var offset = (new Date()).getTimezoneOffset(),
            timezone = (offset>=0 ? '+' : '') + zeroPad_(Math.floor(offset/60),2) + ':' + zeroPad_(offset%60,2);
        valueTo = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + '.' + millisecond + timezone;
    }
    var re = new RegExp(this.pattern, "ig");
    if  (!re.test(valueTo)) {

        var innerMessage = null, message = "The value seems to be invalid.";
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = this.getContext().translate("The value seems to be invalid.");
        }

        return {
            code:"EPATTERN",
            "message":message,
            "innerMessage":innerMessage
        }
    }
};

/**
 * @class
 * @param {number} length
 * @augments {DataValidator}
 * @constructor
 */
function MinLengthValidator(length) {
    this.minLength = length;
    MinLengthValidator.super_.call(this);
}

util.inherits(MinLengthValidator, DataValidator);

MinLengthValidator.prototype.validateSync = function(val) {
    if (typeof val === 'undefined' || val == null) {
        return;
    }
    if (val.hasOwnProperty('length')) {
        if (val.length<this.minLength) {

            var innerMessage = null, message = util.format("The value is too short. It should have %s characters or more.", this.minLength);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = util.format(this.getContext().translate("The value is too short. It should have %s characters or more."), this.minLength);
            }

            return {
                code:"EMINLEN",
                minLength:this.minLength,
                message:message,
                innerMessage:innerMessage
            }

        }
    }
};

/**
 * @class
 * @param {number} length
 * @augments {DataValidator}
 * @constructor
 */
function MaxLengthValidator(length) {
    this.length = length;
    MaxLengthValidator.super_.call(this);
}
util.inherits(MaxLengthValidator, DataValidator);

MaxLengthValidator.prototype.validateSync = function(val) {
    if (typeof val === 'undefined' || val == null) {
        return;
    }

    var innerMessage = null, message = util.format("The value is too long. It should have %s characters or fewer.", this.length);
    if (this.getContext() && (typeof this.getContext().translate === 'function')) {
        innerMessage = message;
        message = util.format(this.getContext().translate("The value is too long. It should have %s characters or fewer."), this.length);
    }

    if (val.hasOwnProperty('length')) {
        if (val.length>this.length) {
            return {
                code:"EMAXLEN",
                maxLength:this.length,
                message: message,
                innerMessage:innerMessage
            }
        }
    }
};

/**
 * @class
 * @param {number|Date|*} min
 * @augments {DataValidator}
 * @constructor
 */
function MinValueValidator(min) {
    this.minValue = min;
    MinValueValidator.super_.call(this);
}

util.inherits(MinValueValidator, DataValidator);

MinValueValidator.prototype.validateSync = function(val) {
    if (typeof val === 'undefined' || val == null) {
        return;
    }
    if (val<this.minValue) {

        var innerMessage = null, message = util.format("The value should be greater than or equal to %s.", this.minValue);
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = util.format(this.getContext().translate("The value should be greater than or equal to %s."), this.minValue);
        }

        return {
            code:"EMINVAL",
            minValue:this.minValue,
            message:message,
            innerMessage:innerMessage
        }
    }
};
/**
 * @class
 * @param {number|Date|*} max
 * @augments {DataValidator}
 * @constructor
 */
function MaxValueValidator(max) {
    this.maxValue = max;
    MaxValueValidator.super_.call(this);
}

util.inherits(MaxValueValidator, DataValidator);

MaxValueValidator.prototype.validateSync = function(val) {
    if (typeof val === 'undefined' || val == null) {
        return;
    }
    if (val>this.maxValue) {

        var innerMessage = null, message = util.format("The value should be lower or equal to %s.", this.maxValue);
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = util.format(this.getContext().translate("The value should be lower or equal to %s."), this.maxValue);
        }

        return {
            code:"EMAXVAL",
            maxValue:this.maxValue,
            message:message,
            innerMessage:innerMessage
        }
    }
};
/**
 * @class
 * @param {number|Date|*} min
 * @param {number|Date|*} max
 * @augments {DataValidator}
 * @constructor
 */
function RangeValidator(min,max) {
    this.minValue = min;
    this.maxValue = max;
    RangeValidator.super_.call(this);
}

util.inherits(RangeValidator, DataValidator);

RangeValidator.prototype.validateSync = function(val) {
    if (typeof val === 'undefined' || val == null) {
        return;
    }
    var minValidator, maxValidator, minValidation, maxValidation;
    if (typeof min !== 'undefined' && this.minValue != null) {
        minValidator = new MinValueValidator(this.minValue);
        minValidation = minValidator.validateSync(val);
    }
    if (typeof max !== 'undefined' && this.maxValue != null) {
        maxValidator = new MaxValueValidator(this.maxValue);
        maxValidation = maxValidator.validateSync(val);
    }
    if (minValidator && maxValidator && (minValidation || maxValidation)) {
        var innerMessage = null, message = util.format("The value should be between %s to %s.", this.minValue, this.maxValue);
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = util.format(this.getContext().translate("The value should be between %s to %s."), this.minValue, this.maxValue);
        }
        return {
            code:"ERANGE",
            maxValue:max,
            message:message,
            innerMessage:innerMessage
        }
    }
    else if (minValidation) {
        return minValidation;
    }
    else if (maxValidation) {
        return maxValidation;
    }
};
/**
 * @class
 * @param {string|*} type
 * @augments {DataValidator}
 * @constructor
 */
function DataTypeValidator(type) {
    if (typeof type === 'string')
        /**
         * @type {{name:string,properties:{pattern:string,patternMessage:string,minValue:*,maxValue:*,minLength:number,maxLength:number},label:string,supertypes:Array,type:string}|*}
         */
        this.dataType = conf.current.dataTypes[type];
    else
        this.dataType = type;
    DataTypeValidator.super_.call(this);
}

util.inherits(DataTypeValidator, DataValidator);

DataTypeValidator.prototype.validateSync = function(val) {
    if (typeof this.dataType === 'undefined') {
        return;
    }
    var properties = this.dataType.properties;
    if (typeof properties !== 'undefined') {
        var validator, validationResult;
        //validate pattern if any
        if (properties.pattern) {
            validator = new PatternValidator(properties.pattern);
            validator.setContext(this.getContext());
            validationResult = validator.validateSync(val);
            if (validationResult) {
                if (properties.patternMessage) {

                    validationResult.message = properties.patternMessage;
                    if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                        validationResult.innerMessage = validationResult.message;
                        validationResult.message = this.getContext().translate(properties.patternMessage);
                    }
                }
                return validationResult;
            }
        }
        if (properties.hasOwnProperty('minValue') && properties.hasOwnProperty('maxValue')) {
            validator = new RangeValidator(properties.minValue, properties.maxValue);
            validator.setContext(this.getContext());
            validationResult = validator.validateSync(val);
            if (validationResult) {
                return validationResult;
            }
        }
        else if (properties.hasOwnProperty('minValue')) {
            validator = new MinValueValidator(properties.minValue);
            validator.setContext(this.getContext());
            validationResult = validator.validateSync(val);
            if (validationResult) {
                return validationResult;
            }
        }
        else if (properties.hasOwnProperty('maxValue')) {
            validator = new MaxValueValidator(properties.maxValue);
            validator.setContext(this.getContext());
            validationResult = validator.validateSync(val);
            if (validationResult) {
                return validationResult;
            }
        }
        if (properties.hasOwnProperty('minLength')) {
            validator = new MinLengthValidator(properties.minLength);
            validator.setContext(this.getContext());
            validationResult = validator.validateSync(val);
            if (validationResult) {
                return validationResult;
            }
        }
        if (properties.hasOwnProperty('maxLength')) {
            validator = new MaxLengthValidator(properties.maxLength);
            validator.setContext(this.getContext());
            validationResult = validator.validateSync(val);
            if (validationResult) {
                return validationResult;
            }
        }
    }
};
/**
 * @classdesc Represents an event listener for validating field values. This listener is automatically  registered in all data models.
 * @constructor
 */
function DataValidatorListener() {
    //
}

/**
 * Occurs before creating or updating a data object and validates not nullable fields.
 * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occured.
 */
DataValidatorListener.prototype.beforeSave = function(event, callback) {
    if (event.state === 4) { return callback(); }
    if (event.state === 1) {
        return event.model.validateForInsert(event.target).then(function() {
            return callback();
        }).catch(function(err) {
            return callback(err);
        });
    }
    else if  (event.state === 2) {
        return event.model.validateForUpdate(event.target).then(function() {
            return callback();
        }).catch(function(err) {
            return callback(err);
        });
    }
    else {
        return callback();
    }
};

/**
 * @class
 * @augments {DataValidator}
 * @constructor
 */
function RequiredValidator() {
    RequiredValidator.super_.call(this);
}
util.inherits(RequiredValidator, DataValidator);

RequiredValidator.prototype.validateSync = function(val) {
    var invalid = false;
    if (typeof val === 'undefined' || val == null) {
        invalid=true;
    }
    else if ((typeof val === 'number') && isNaN(val)) {
        invalid=true;
    }
    if (invalid) {

        var innerMessage = null, message = "A value is required.";
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = this.getContext().translate("A value is required.");
        }

        return {
            code:"ENULL",
            message:message,
            innerMessage:innerMessage
        }

    }
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        PatternValidator:PatternValidator,
        MaxValueValidator:MaxValueValidator,
        MinValueValidator:MinValueValidator,
        MaxLengthValidator:MaxLengthValidator,
        MinLengthValidator:MinLengthValidator,
        RangeValidator:RangeValidator,
        RequiredValidator:RequiredValidator,
        DataTypeValidator:DataTypeValidator,
        DataValidatorListener:DataValidatorListener
    };
}