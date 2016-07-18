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
 * @type {*}
 * @private
 */
var DataValidators_ = {
    integer: function(val) {
        if (!/^[+-]?[0-9]*$/ig.test(val)) {
            return {
                code:"EINT",
                message:"The value should be a valid integer."
            }
        }
    },
    negativeInteger: function(val) {
        if (!/^[-][1-9][0-9]*$/ig.test(val)) {
            return {
                code:"ENEG",
                message:"The value should be a valid negative integer."
            }
        }
    },
    nonNegativeInteger: function(val) {
        if (!/^[+]?[0-9]*$/ig.test(val)) {
            return {
                code:"ENONNEG",
                message:"The value should be a valid non negative integer."
            }
        }
    },
    nonPositiveInteger:function(val) {
        if (!/^[-][0-9]*$/ig.test(val)) {
            return {
                code:"ENONPOS",
                message:"The value should be a valid non positive integer."
            }
        }
    },
    positiveInteger:function(val) {
        if (!/^[+]?[1-9][0-9]*$/ig.test(val)) {
            return {
                code:"EPOS",
                message:"The value should be a valid positive integer."
            }
        }
    },
    number:function(val) {
        if (!/^[-+]?[0-9]*\.?[0-9]*$/ig.test(val)) {
            return {
                code:"ENUMBER",
                message:"The value should be a valid number."
            }
        }
    },
    negativeNumber:function(val) {
        if (!/^[-][0-9]*\.?[0-9]*$/ig.test(val)) {
            return {
                code:"ENEG",
                message:"The value should be a valid negative number."
            }
        }
    },
    nonNegativeNumber:function(val) {
        if (!/^[+]?[0-9]*\.?[0-9]*$/ig.test(val)) {
            return {
                code:"ENONNEG",
                message:"The value should be a valid non negative number."
            }
        }
    },
    nonPositiveNumber:function(val) {
        if (!/^[-][0-9]*\.?[0-9]*$/ig.test(val)) {
            return {
                code:"ENONPOS",
                message:"The value should be a valid non positive number."
            }
        }
    },
    email:function(val) {
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/ig.test(val)) {
            return {
                code:"EEMAIL",
                message:"The value should be a valid email address."
            }
        }
    },
    url:function(val) {
        if (!/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/ig.test(val)) {
            return {
                code:"EURL",
                message:"The value should be a valid URL."
            }
        }
    },
    absoluteUrl:function(val) {
        if (!/^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/ig.test(val)) {
            return {
                code:"EABSURL",
                message:"The value should be a valid URL."
            }
        }
    },
    relativeUrl:function(val) {
        if (!/^(\/)([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/ig.test(val)) {
            return {
                code:"ERELURL",
                message:"The value should be a valid relative URL."
            }
        }
    },
    ip:function(val) {
        if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/ig.test(val)) {
            return {
                code:"EADDRESS",
                message:"The value should be a valid IP address."
            }
        }
    },
    minLength: function(val, min) {
        if (typeof min !== 'number') { return; }
          if (typeof val === 'string') {
              if (val.length<parseInt(min)) {
                  return {
                      code:"EMINLEN",
                      minLength:min,
                      message:"The value is too short. It should have %s characters or more."
                  }
              }
          }
    },
    maxLength: function(val, max) {
        if (typeof max !== 'number') { return; }
        if (typeof val === 'string') {
            if (val.length>parseInt(max)) {
                return {
                    code:"EMAXLEN",
                    maxLength:max,
                    message:"The value is too long. It should have %s characters or fewer."
                }
            }
        }
    },
    minValue: function(val, min) {
        if (/^[-+]?[0-9]*\.?[0-9]*$/ig.test(val)) {
            if (parseFloat(val)<parseFloat(min)) {
                return {
                    code:"EMINVAL",
                    minValue:min,
                    message:"The value should be greater than or equal to %s."
                }
            }
        }
        else if (val instanceof Date) {
            if (val<min) {
                return {
                    code:"EMINVAL",
                    minValue:min,
                    message:"The value should be greater than or equal to %s."
                }
            }
        }
    },
    maxValue: function(val, max) {
        if (/^[-+]?[0-9]*\.?[0-9]*$/ig.test(val)) {
            if (parseFloat(val)>parseFloat(max)) {
                return {
                    code:"EMAXVAL",
                    maxValue:max,
                    message:"The value should be lower or equal to %s."
                }
            }
        }
        else if (val instanceof Date) {
            if (val>max) {
                return {
                    code:"EMAXVAL",
                    maxValue:max,
                    message:"The value should be lower or equal to %s."
                }
            }
        }
    },
    range: function(val, min, max) {
        if (/^[-+]?[0-9]*\.?[0-9]*$/ig.test(val)) {
            var minValidation = null, maxValidation = null;
            if (typeof min !== 'undefined' && min != null) {
                minValidation = DataValidators_.minValue(val, min);
            }
            if (typeof min !== 'undefined' && min != null) {
                maxValidation = DataValidators_.maxValue(val, max);
            }
            if (minValidation || maxValidation) {
                return {
                    code:"ERANGE",
                    minValue:min,
                    maxValue:max,
                    message:"The value should be lower or equal to %s."
                }
            }
        }
    },
    pattern:function(val, pattern) {
        if (typeof pattern === 'string') {
            var re = new RegExp(pattern, "ig");
            if  (re.test(val)) {
                return {
                    code:"EREGEXP",
                    "message":"The value seems to be invalid."
                }
            }
        }
    }
};

/**
 *
 * @param {*} opts
 * @constructor
 */
function DataValidator(opts) {
    this.options = opts;
    /**
     * Gets or sets a validation in validators collection.
     * @param {string} name - A string which represents the name of the validator
     * @param {Function=} fn - The validation method which is going to be added in validators collection
     * @returns {DataValidator|*}
     */
    this.validator = function(name, fn) {
        if (typeof fn === 'undefined') {
            return DataValidators_[name];
        }
        DataValidators_[name] = fn;
        return this;
    };
}
/**
 * Validates the given value against the specified validation options.
 * @param {*} val
 */
DataValidator.prototype.validate = function(val) {
    //
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
DataValidatorListener.prototype.afterSave = function(event, callback) {
    return callback();
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        DataValidator:DataValidator,
        DataValidatorListener:DataValidatorListener
    };
}