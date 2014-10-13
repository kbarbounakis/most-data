/**
 * Created by Kyriakos Barbounakis on 11/3/2014.
 */
var data = require('./../index'), util = require('util');


exports.testLazyProperty = function(test)
{
    data.execute(function(context) {
        var model = context.model('User');
        var user = model.convert({ name:'anonymous' });
        user.attr('id', function(err, value) {
            context.finalize(function() {
                if (err) throw err;
                console.log('Get data object property.');
                console.log(JSON.stringify(value));
                test.done();
            });
        });
    });
};

exports.testGetObject1 = function(test)
{
    data.execute(function(context) {
        var model = context.model('Person');
        model.get(1, function(err, result) {
            context.finalize(function() {
                if (err) throw err;
                console.log('Get data object by key.');
                console.log(JSON.stringify(result));
                test.done();
            });
        });
    });
};

exports.testSaveObject1 = function(test)
{

    data.execute(function(context)
    {
        var model = context.model('Person');
        var item = { name:'Alan Jones', alternateName: 'Alan Ian Jones', givenName:'Alan',familyName:'Jones' };
        model.save(item, function(err)
        {
            if (err) {
                context.finalize(function() {
                    throw err;
                });
            }
            console.log('Object was saved.');
            console.log(JSON.stringify(item));
            model.remove(item, function(err) {
                context.finalize(function() {
                    if (err) throw err;
                    console.log('Object was deleted successfully.');
                    test.done();
                });
            });
        });
    });
};