/**
 * Created by Kyriakos Barbounakis on 11/3/2014.
 */
var data = require('./../index'),
    util = require('util'),
    mssql = require('mssql'),
    qry = require('most-query'),
    array = require('most-array'), async=require('async');


function sampleResolveMember(member, callback)
{
    callback(null,'UserData.'.concat(member));
}

function sampleResolveMethod(method, args, callback)
{
    if (method=='me') {
        callback(null, 1);
    }
    else if (method=='today') {
        callback(null, new Date());
    }
    else {
        callback();
    }
}


exports.testExpressions = function(test)
{

    var parser = qry.openData.createParser();
    parser.resolveMember = sampleResolveMember;
    parser.resolveMethod = sampleResolveMethod;
    var arr = [
        "endswith(alternateName,'S') eq true",
        "startswith(alternateName,'S') eq true",
        "indexof(alternateName, 'Site') eq 0",
        "AccountType eq 0 or AccountType eq 1",
        "(AccountType ne 0) and (AccountType ne 1)",
        "id eq me()",
        "DateCreated gt today()",
        "AccountType ne 0",
        "AccountType gt -1",
        "(name eq 'Administrator')",
        "((name eq 'Administrator') or (name eq 'admin')) or (name eq 'root')",
        "id gt 20",
        "id ge 20.5",
        "id lt 20",
        "id le 100",
        "(id le 200) and (id gt 3.5)",
        "length(alternateName) gt 20",
        "substring(alternateName, 5) eq 'RED'",
        "tolower(Location_Code) eq 'code red'",
        "toupper(FText) eq '2ND ROW'",
        "trim(FCode) eq 'CODE RED'",
        "concat(FText, ', ',alternatename) eq '2nd row, CODE RED'",
        "day(FDateTime) eq 12",
        "month(FDateTime) eq 12",
        "round(FDecimal) eq 1"
    ];

    async.eachSeries(arr, function(item,cb) {
        parser.parse(item,
            function(err, query) {
                if (err) { cb(err); return; }
                log_query({ $where:query });
                cb();
            });
    }, function(err) {
        if (err) { throw err; }
        test.done();
    });
};




/*
exports.testConnect = function(test) {
    data.execute(function (context) {


       *//* context.db.open(function (err) {
            if (err)
                throw err;
            else {
                console.log("Connected");
                test.done();
            }

        });*//*


      *//*  context.db.execute('EXECUTE(\'CREATE VIEW dbo.ThingData AS \n SELECT ThingBase.id, ThingBase.additionalType, ThingBase.alternateName, ThingBase.description, ThingBase.image, ThingBase.name, ThingBase.sameAs, ThingBase.url, ThingBase.dateCreated, ThingBase.dateModified FROM ThingBase\')',null,function(err){
            if (err) {
                throw err;
            }
            test.done();
        });*//*
     *//*    context.model('Person').migrate(function(err) {
            if (err) {
                throw err;
            }
        }) ;*//*

    });
}*/

/*exports.testGetObject = function(test)
{
    data.execute(function(context) {
        var model = context.model('Employee');
        model.get(1002, function(err, result) {
            if (err) throw err;
            context.finalize(function() {
                console.log('Get data object by key.');
                console.log(JSON.stringify(result));
                test.done();
            });
        });
    });
};*/

function log_query(q)
{
    console.log('\n');
    //util.log(util.format('JSON Query: %s', JSON.stringify(q)));
    util.log(util.format('SQL Query: %s', data.mssql.format(q)));
}
/*
exports.testPaging = function(test) {
    try {

        var q = qry.query('employees').where('officeCode').equal('4').select(['employeeNumber', 'lastName', 'firstName']),
            entity = qry.entity('employees');
        q.$select['employees'].push(entity.select('officeCode'));
        log_query(q);
        //q.orderBy(entity.select('lastName'));
        //var orderSql = data.mssql.format(q.$order,'%o');
        q.$select['employees'].push(qry.fields.select(util.format('ROW_NUMBER() OVER(%s)',q.$order?data.mssql.format(q.$order,'%o'): 'ORDER BY (SELECT NULL)')).as('__RowIndex'));

        var subQuery = data.mssql.format(q);
        //delete row index field
        q.$select['employees'].pop();
        var fields = [];
        array(q.$select['employees']).each(function(x) {
            if (typeof x === 'string') {
                fields.push(new  qry.classes.QueryField(x));
            }
            else {
                var field = util._extend(new qry.classes.QueryField(), x);
                fields.push(field.as() || field.name());
            }
        });

        var sql = util.format('SELECT %s FROM (%s) t0 WHERE __RowIndex BETWEEN %s AND %s',array(fields).select(function(x) {
            return data.mssql.format(x,'%f');
        }).toArray().join(', '),subQuery, 5, 8);

        util.log(sql);
        test.done();
    }
    catch (e) {
        throw e;
    }
}*/

/*exports.testObjectExpression = function(test) {
    try {

        var q = {"$select":{"Employee":["employeeNumber","lastName","firstName"]},"$where":{"officeCode":"4"}};
        log_query(q);
        test.done();
    }
    catch (e) {
        throw e;
    }
}*/

/*
exports.testConnect = function(test) {


    data.execute(function (context) {

        console.log(context.db.connectionString);

       *//* context.db.open(function(err){
            if (err)
                 throw err;
            else
            {
                console.log ("Connected");
                test.done();
            }

        });*//*



      context.model('Person').migrate(function(err) {
           if (err) { throw err; }

        }) ;

      *//*  context.db.open();

        context.finalize(function () {
            test.done();
        });*//*
    });

};*/


  /*
var connectionString = "Driver={SQL Server Native Client 10.0};Server=darwin\\SQLEXPRESS;Database=classicmodels;Uid=node;Pwd=s3cr3t";
    mssql.open(connectionString,function(err,result)
    {
        if(err)
        {
            console.log("Error opening the connection! Error was: " + err);
            test.done();

        }
else
        {
            console.log ("Connection is ok!");
test.done();

        }
    });*/
