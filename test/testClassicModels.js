/**
 * Created by kbarbounakis on 14/4/2014.
 */
var data = require('./../index'),
    util = require('util'),
    async = require('async'),
    array = require('most-array');
/**
 * @class Employee
 * @param {*} obj
 * @constructor
 * @augments DataObject
 */
function Employee(obj)
{
    this.employeeNumber = undefined;
    this.firstName = undefined;
    this.lastName = undefined;
    this.email = undefined;
    util._extend(this, obj);
    
}

util.inherits(Employee, data.DataObject);

/**
 * @class Group
 * @param {*} obj
 * @constructor
 * @augments DataObject
 */
function Group(obj)
{
   util._extend(this, obj);
}
util.inherits(Group, data.DataObject);
/**
 * Gets a collection of current user group members
 * @returns {DataQueryable}
 * @constructor
 */
Group.prototype.members = function() {
    return this.query('members');
};



/**
 * @class User
 * @param {*} obj
 * @constructor
 * @augments DataObject
 */
function User(obj)
{
    if ((obj!=undefined) && (obj!=null)) {
        util._extend(this, obj);
    }
}
util.inherits(User, data.DataObject);

exports.testGetEmployees = function(test)
{
    data.execute(function(context) {
        var model = context.model('Employee');
        model.take(10, function(err, result) {
            if (err) { throw err; }
            for (var i = 0; i < result.length; i++) {
                var obj = new Employee(result[i]);
                util.log(util.format('%s. %s %s', i+1,obj.firstName, obj.lastName ));
            }
            context.finalize(function() {
                test.done();
            })
        });
    });
};

exports.testMappings = function(test) {
    data.execute(function(context) {
        util.log(util.format('\nMapping (Employee.reportsTo): %s', JSON.stringify(context.model('Employee').inferMapping('reportsTo'))));
        util.log(util.format('\nMapping (Employee.office): %s', JSON.stringify(context.model('Employee').inferMapping('office'))));
        util.log(util.format('\nMapping (Office.employees): %s', JSON.stringify(context.model('Office').inferMapping('employees'))));
        util.log(util.format('\nMapping (Group.members): %s', JSON.stringify(context.model('Group').inferMapping('members'))));
        test.done();
    });
};

exports.testGetEmployee = function(test) {
    data.execute(function(context) {
        var model = context.model('Employee');

        model.where('employeeNumber').equal(1088).first(function(err, result) {
            if (err) { throw err; }
            var obj = new Employee(result);
            obj.execute(context, function() {
                var reportsTo = obj.item('reportsTo');
                reportsTo.first(function (err, result) {
                    if (err) { throw err; }
                    util.log(util.format('Employee. %s %s', obj.firstName, obj.lastName ));
                    util.log(util.format('Supervisor. %s %s',result.firstName, result.lastName ));
                    context.finalize(function() {
                        test.done();
                    });
                });
            });
        })
    });
};

exports.testGetEmployeeOpenData = function(test) {
    data.execute(function(context) {
        var model = context.model('Employee');
        model.filter("employeeNumber eq 1088", function(err, q) {
            if (err) { throw err; }
            q.first(function(err, result) {
                if (err) { throw err; }
                var obj = new Employee(result);
                util.log(util.format('Employee. %s %s', obj.firstName, obj.lastName ));
                context.finalize(function() {
                    test.done();
                });
            });
        });
    });
};

exports.testGetEmployeeOpenData2 = function(test) {
    data.execute(function(context) {
        var model = context.model('Employee');
        model.filter("startswith(lastName,'Pat') eq true", function(err, q) {
            if (err) { throw err; }
            q.first(function(err, result) {
                if (err) { throw err; }
                var obj = new Employee(result);
                util.log(util.format('Employee. %s %s', obj.firstName, obj.lastName ));
                context.finalize(function() {
                    test.done();
                });
            });
        });
    });
};

/*
exports.testNewEmployee = function(test) {
    data.execute(function(context) {
        var obj = new Employee({
            firstName:'John',
            lastName:'Paterson',
            extension:'x45',
            email:'paterson@example.com',
            officeCode:4,
            reportsTo: 1143,
            jobTitle:'Sales Rep'});
        obj.save(context, function(err, result) {
            if (err) { throw err; }
            context.finalize(function() {
                test.done();
            });
        });
    });
};
*/
/*exports.testUserGroup = function(test) {
    data.execute(function(context) {
        var obj = { id:1 };
        context.model('Group').remove(obj, function(err, result) {
            if (err) { throw err; }
            context.finalize(function() {
                test.done();
            });
        });
    });
};*/

/*
exports.testNewUserGroup = function(test) {
    data.execute(function(context) {
        var obj = {
            name:'Administrators',
            alternateName:'Site Administrators',
            additionalType:'Group',
            description:'Built-in site administrators group.',
            accountType:1 };
        context.model('Group').where('name').equal('Administrators').count(function(err, result) {
            if (err) { throw err; }
            if (result==0) {
                context.model('Group').save(obj, function(err, result) {
                    if (err) { throw err; }
                    context.finalize(function() {
                        test.done();
                    });
                });
            }
            else {
                context.finalize(function() {
                    test.done();
                });
            }
        });
    });
};

exports.testNewUserGroup_Users = function(test) {
    data.execute(function(context) {
        var obj = {
            name:'Users',
            alternateName:'Site Users',
            additionalType:'Group',
            description:'Built-in site users group.',
            accountType:1 };
        context.model('Group').where('name').equal('Users').count(function(err, result) {
            if (err) { throw err; }
            if (result==0) {
                context.model('Group').save(obj, function(err, result) {
                    if (err) { throw err; }
                    context.finalize(function() {
                        test.done();
                    });
                });
            }
            else {
                context.finalize(function() {
                    test.done();
                });
            }
        });
    });
};


exports.testNewUser = function(test) {
    data.execute(function(context) {
        var obj = {
            name:'Administrator',
            alternateName:'Site Administrator',
            additionalType:'User',
            description:'Built-in site administrator.',
            accountType:1,
            userPassword:'{clear}admin' };
        context.model('User').where('name').equal('Administrator').count(function(err, result) {
            if (err) { throw err; }
            if (result==0) {
                context.model('User').save(obj, function(err, result) {
                    if (err) { throw err; }
                    context.finalize(function() {
                        test.done();
                    });
                });
            }
            else {
                context.finalize(function() {
                    test.done();
                });
            }
        });
    });
};

exports.testNewUsersForEmployees = function(test) {
    util.log("\n--Create users for existing employees");
    data.execute(function(context) {
        //get employees
        context.model('Employee').take(10, function(err, result) {
            if (err) { throw err; }
            if (result.length>0) {

                //var employees = array(result).select(function(x) { return new Employee(x); }).toArray();
                async.eachSeries(result, function(obj, cb) {
                    //convert object
                    var employee = new Employee(obj);
                    employee.execute(context, function() {
                        var user = new User({
                            name: employee.email,
                            alternateName: employee.firstName.concat(' ', employee.lastName),
                            additionalType: 'User',
                            accountType: 0,
                            userPassword: '{clear}'.concat(data.common.randomChars(8))
                        });
                        user.save(context, function(err) {
                            if (err) {
                                util.log(err.message);
                            }
                            //continue
                            cb(null);
                        });
                    });
                }, function(err, result) {
                    if (err) { throw err; }
                    context.finalize(function() {
                        test.done();
                    });
                });
            }

        })
    });
};

exports.testGetUserGroup = function(test) {
    data.execute(function(context) {
        var obj = {
            name:'Administrators',
            alternateName:'Site Administrators',
            additionalType:'Group',
            description:'Built-in site administrators group.',
            accountType:1 };
        context.model('Group').where('name').equal('Administrators').first(function(err, result) {
            if (err) { throw err; }
            var group = new Group(result[0]);
            //execute in context
            group.execute(context, function() {
                var members = group.items('members');
                members.migrate(function(err) {
                    //group.query('members')
                    members.all(function(err, result) {
                        if (err) { throw err; }
                        if (result.length>0) {
                            for (var i = 0; i < result.length; i++) {
                                var o = result[i];
                                util.log(util.format('%s. %s', i + 1, o.name));
                            }
                        }
                        context.finalize(function() {
                            test.done();
                        });
                    });
                });

            });
        });
    });
};


exports.testAddGroupMembers = function(test) {
    data.execute(function(context) {
        context.model('Group').where('name').equal('Users').first(function(err, result) {
            if (err) { throw err; }
            var group = new Group(result[0]);
            //execute in context
            group.execute(context, function() {
                //find user
                context.model('Account').where('name').equal('mpatterso@classicmodelcars.com').first(function(err, result) {
                    if (err) { throw err; }
                    if (result.length==0) {
                        context.finalize(function() {
                            test.done();
                        });
                        return;
                    }
                    //get account
                    var account = result[0];
                    //get members
                    var members = group.items('members');
                    members.migrate(function(err) {
                       if (err) { throw err; }
                        members.remove({ name: account.name }, function(err) {
                            if (err) { throw err; }
                            members.insert({ name: account.name }, function(err) {
                                if (err) { throw err; }
                                context.finalize(function() {
                                    test.done();
                                });
                            });
                        });
                    });

                });
            });
        });
    });
};*/
