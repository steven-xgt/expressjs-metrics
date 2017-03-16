'use strict';

var builder = require('./lib/builder');
var header = require('./lib/header');
var chrono = require('./lib/chrono');
var optionsChecker = require('./lib/options.checker');

module.exports = function expressMetrics(options) {
  var client;

  options = optionsChecker.check(options);

  builder.init(options);
  client = builder.getClient();

  header.init({ header: options.header });
  chrono.init({ decimals: options.decimals });

  return function (req, res, next) {
    // chrono.start();
    res.startAt = process.hrtime();
    res.startTime = new Date();
    // decorate response#end method from express
    var end = res.end;
    res.once('finish',function() {
      // var responseTime = new Date() - this.startTime;
      var diff = process.hrtime(this.startAt);
      var responseTime = diff[0] * 1e3 + diff[1] * 1e-6;
      header.setResponseTime(res, responseTime);

      // call to original express#res.end()
      // end.apply(res, arguments);

      // console.log({
      //   route: req.route,
      //   method: req.method,
      //   status: res.statusCode,
      //   time: responseTime
      // })
      if(res.statusCode==200){
        client.send({
          route: { path: req.originalUrl, stack: req.route.stack, methods: req.route.methods },
          method: req.method,
          status: res.statusCode,
          time: responseTime
        });
      }else{
        client.send({
          route: req.route,
          // route: { path: res.statusCode, stack: req.route.stack, methods: req.route.methods },
          method: req.method,
          status: res.statusCode,
          time: responseTime
        });
      }

    })
    // res.end = function () {
    //   // var responseTime = chrono.stop();
    //   var responseTime = new Date() - this.startTime;
    //   header.setResponseTime(res, responseTime);
    //
    //   // call to original express#res.end()
    //   end.apply(res, arguments);
    //    // console.log({
    //    //   route: req.route,
    //    //   method: req.method,
    //    //   status: res.statusCode,
    //    //   time: responseTime
    //    // })
    //   client.send({
    //     route: { path: req.originalUrl, stack: req.route.stack, methods: req.route.methods },
    //     method: req.method,
    //     status: res.statusCode,
    //     time: responseTime
    //   });
    // };

    next();
  };

};

module.exports.listen = function listen(port) {
  if (builder.getServer()) {
    return builder.getMetricsServer();
  }

  return builder.startServer(port);
};

module.exports.close = function close(callback) {
  builder.getServer().stop(callback);
};