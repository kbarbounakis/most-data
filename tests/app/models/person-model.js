/**
 * MOST Web Framework PersonModel Class
 */
var util = require('util');
var Q = require('q');
var DataObject = require('../../../data-object').DataObject;
var EdmMapping = require('../../../odata').EdmMapping;
var EdmType = require('../../../odata').EdmType;
var defineDecorator = require('../../../odata').defineDecorator;
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
 * @return {Promise.<DataQueryable>|*}
 */
PersonModel.prototype.getPendingOrders = function()
{
    return this.context.model('Order').where('customer').equal(this.id)
        .and('orderStatus/alternateName').equal('OrderProcessing');
};
defineDecorator(PersonModel.prototype, 'getPendingOrders', EdmMapping.func('PendingOrders',EdmType.CollectionOf('Order')));

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