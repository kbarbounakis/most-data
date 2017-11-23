/**
 * MOST Web Framework PersonModel Class
 */
var util = require('util');
var Q = require('q');
var DataObject = require('../../../data-object').DataObject;
/**
 * @class 
 * @constructor
 * @param {*=} obj
 * @augments {DataObject}
 */
function PersonModel(obj) {
    PersonModel.super_.bind(this)('Person', obj);
}
util.inherits(PersonModel, DataObject);

/**
 * @return {Promise}
 */
PersonModel.prototype.test = function()
{
    return Q.resolve();
};

if (typeof module !== 'undefined') {
	module.exports = PersonModel;
}