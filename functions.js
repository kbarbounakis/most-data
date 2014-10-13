/**
 * Created by Kyriakos Barbounakis on 30/3/2014.
 */
var __types__ = require('./types');
/**
 * @class FunctionContext
 * @constructor
*/
function FunctionContext() {
    /**
     * @type __model__.classes.DataContext
    */
    this.context = undefined;
     /**
      * @type DataModel
      */
    this.model = undefined;
    /**
     * @type *
     */
    this.target = undefined;
}

var __functions__ = {
    /**
     * @namespace
     */
    classes: {
        FunctionContext: FunctionContext
    },
    /**
     * Gets the current date and time
     * @param {FunctionContext} e The current function context
     * @param {Function} callback The callback function to be called
     */
    now: function(e, callback) {
        callback.call(this, null, new Date());
    },
    /**
     * Gets the current date
     * @param {FunctionContext} e
     * @param {Function} callback
     */
    today: function(e, callback) {
        var d = new Date();
        callback.call(this, d.getDate());
    },
    /**
     * Gets new identity key for a primary key column
     * @param {FunctionContext} e
     * @param {Function} callback
     */
    newid: function(e, callback)
    {
        e.model.context.db.selectIdentity(e.model.sourceAdapter, e.model.primaryKey, callback);
    },
    /**
     * Gets the current user
     * @param {FunctionContext} e The current function context
     * @param {Function} callback The callback function to be called
     */
    user: function(e, callback) {
        callback = callback || function() {};
        var user = e.model.context.user || { };
        if (user['id']) {
            callback(null, user['id']);
            return;
        }
        var userModel = e.model.context.model('User');
        userModel.where('name').equal(user.name).or('name').equal('anonymous').silent().select(['id','name']).take(2, function(err, result) {
            if (err) {
                console.log(err);
                callback();
            }
            else {
                //filter result to exclude anonymous user
                var filtered = result.filter(function(x) { return x.name!='anonymous'; }, result);
                //if user was found
                if (filtered.length>0) {
                    e.model.context.user.id = result[0].id;
                    callback(null, result[0].id);
                }
                //if anonymous was found
                else if (result.length>0) {
                    callback(null, result[0].id);
                }
                else
                    callback();
            }
        });

    }
}
/**
 *
 */
if (typeof exports !== 'undefined') {
    module.exports = __functions__;
}