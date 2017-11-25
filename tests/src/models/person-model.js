/**
 * MOST Web Framework Person Class
 */

import {EdmMapping,EdmType} from './../../../odata';
import {DataObject} from './../../../data-object';

/**
 * @class
 * @extends DataObject
 * @augments DataObject
 */
export default class Person extends DataObject {
    /**
     * @constructor
     * @param {*} obj
     */
    constructor(obj) {
        super(obj);
    }
    @EdmMapping.func('PendingOrders',EdmType.CollectionOf("Order"))
    getPendingOrders() {
        return this.context.model('Order').where('customer').equal(this.id)
            .and('orderStatus/alternateName').equal('OrderProcessing');
    }
    @EdmMapping.func('Me',"Person")
    me() {
        return this.context.model('Person').filter("user eq me()").getItem();
    }

}