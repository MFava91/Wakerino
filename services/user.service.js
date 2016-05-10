var config = require('config.json');
var _ = require('lodash');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var Q = require('q');
var mongo = require('mongoskin');
var db = mongo.db(config.connectionString, { native_parser: true });
db.bind('users');
var WakaIstance = require('wakatime');
require('datejs');

var CronJob = require('cron').CronJob;
new CronJob('00 55 23 * * *', function() {
  db.users.find().toArray(function (err, users) {
    for(var i = 0; i < users.length; i++) {
      createStat(users[i]._id);
    }
  })
}, null, true);

var service = {};


service.authenticate = authenticate;
service.getById = getById;
service.create = create;
service.update = update;
service.updateApiKey = updateApiKey;
service.delete = _delete;

service.checkApiKey = checkApiKey;
service.createStat = createStat;
service.fetchMissingWeekStats = fetchMissingWeekStats;
service.fetchSevenDay = fetchSevenDay;
module.exports = service;

//authentication
function authenticate(username, password) {
    var deferred = Q.defer();

    db.users.findOne({ username: username }, function (err, user) {
        if (err) deferred.reject(err);

        if (user && bcrypt.compareSync(password, user.hash)) {
            // authentication successful
            deferred.resolve(jwt.sign({ sub: user._id }, config.secret));
        } else {
            // authentication failed
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getById(_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function (err, user) {
        if (err) deferred.reject(err);

        if (user) {
            // return user (without hashed password)
            deferred.resolve(_.omit(user, 'hash'));
        } else {
            // user not found
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function fetchSevenDay(apikey) {
  var deferred = Q.defer();
  var stats = [];
  if(stats.length == 6) {
    deferred.resolve(stats);
  } else {
    //loop to fetch stats in synchronous way
    var loop = function(i) {
      var day = Date.parse(i.toString()).toString('yyyy-MM-dd');
      //fetch stat of 'i' day before
      var waka = fetchWaka(day, apikey);
      waka.then(function (stat) {
        stats.push(stat);
        if (++i < 0) {
          loop(i);
        } else {
          var waka = fetchWaka(Date.today().toString('yyyy-MM-dd'), apikey);
          waka.then(function (stat) {
            stats.push(stat);
            deferred.resolve(stats);
          })
        }
      })
    };
    loop(-6);
  }
  return deferred.promise;
}

//Checks if the entered key is valid
function checkApiKey(apiKey) {
  var deferred = Q.defer();
  var wi = new WakaIstance(apiKey);
  wi.currentUser(function (error, response, user) {
    var parsedUser = JSON.parse(user);
    if (parsedUser.error == 'Unauthorized') {
      //apiKey is not valid
      deferred.resolve('Unauthorized');
    } else {
      //apiKey valid
      deferred.resolve('Authorized');
    }
  });
  return deferred.promise;
}

function create(userParam) {
    var deferred = Q.defer();

    // validation
    db.users.findOne(
        { username: userParam.username },
        function (err, user) {
            if (err) deferred.reject(err);

            if (user) {
                // username already exists
                deferred.reject('Username "' + userParam.username + '" is already taken');
            } else {
                var check = checkApiKey(userParam.apiKey);
                check.then(function(resp){
                  if(resp == 'Unauthorized') {
                    //apiKey is not valid
                    deferred.reject('ApiKey error!');
                  } else {
                    createUser();
                  }
                })
            }
        });

    function createUser() {
        // set user object to userParam without the cleartext password
        var user = _.omit(userParam, 'password');
        // add hashed password to user object
        user.hash = bcrypt.hashSync(userParam.password, 10);
        //fetch last week's stats of the user
        var fetchData = fetchSevenDay(user.apiKey);
        fetchData.then(function (stats) {
          user.stats = stats;

          db.users.insert(
            user,
            function (err, doc) {
              if (err) deferred.reject(err);

              deferred.resolve();
            });
        });
    }
    return deferred.promise;
}

function update(_id, userParam) {
    var deferred = Q.defer();

    // validation
    db.users.findById(_id, function (err, user) {
        if (err) deferred.reject(err);

        if (user.username !== userParam.username) {
            // username has changed so check if the new username is already taken
            db.users.findOne(
                { username: userParam.username },
                function (err, user) {
                    if (err) deferred.reject(err);

                    if (user) {
                        // username already exists
                        deferred.reject('Username "' + req.body.username + '" is already taken')
                    } else {
                        updateUser();
                    }
                });
        } else {
            updateUser();
        }
    });

    function updateUser() {
        // fields to update
        var set = {
            firstName: userParam.firstName,
            lastName: userParam.lastName,
            username: userParam.username,
            apiKey: userParam.apiKey
        };

        // update password if it was entered
        if (userParam.password) {
            set.hash = bcrypt.hashSync(userParam.password, 10);
        }

        db.users.update(
            { _id: mongo.helper.toObjectID(_id) },
            { $set: set },
            function (err, doc) {
                if (err) deferred.reject(err);

                deferred.resolve();
            });
    }

    return deferred.promise;
}

function updateApiKey(_id, userParam) {
  var deferred = Q.defer();

  // validation
  var check = checkApiKey(userParam.newApiKey);
  check.then(function(resp) {
    if(resp == 'Unauthorized') {
      //apiKey is not valid
      deferred.reject('ApiKey error!');
    } else {
      updateUserApiKey();
      fetchMissingWeekStats(_id);
    }
  });

  function updateUserApiKey() {
    // fields to update
    var set = {
      apiKey: userParam.newApiKey,
      stats: []
    };

    db.users.update(
      { _id: mongo.helper.toObjectID(_id) },
      { $set: set },
      function (err, doc) {
        if (err) deferred.reject(err);

        deferred.resolve();
      });
  }

  return deferred.promise;
}

function _delete(_id) {
    var deferred = Q.defer();

    db.users.remove(
        { _id: mongo.helper.toObjectID(_id) },
        function (err) {
            if (err) deferred.reject(err);

            deferred.resolve();
        });

    return deferred.promise;
}

//stats

//Retrieve stat from api
function  fetchWaka(day, apiKey) {
  var deferred = Q.defer();
  var wi = new WakaIstance(apiKey);
  wi.summaries({start: day, end: day}, function (error, response, summary) {
    //parse stat retrieved
    var parsedSummary = JSON.parse(summary)
    var grandTotal = parsedSummary.data[0].grand_total;
    var stat = {
        day: day,
        hours: grandTotal.hours,
        minutes: grandTotal.minutes,
        total_seconds: grandTotal.total_seconds
    };
    //return stat
    deferred.resolve(stat);
  });
  return deferred.promise;
}

//Retrieve stat from api and save them into the db
function createStat(_id) {
  var deferred = Q.defer();
  var today = new Date().toString('yyyy-MM-dd');
  var profile = getById(_id);
  profile.then(function(user) {
    var waka = fetchWaka(today, user.apiKey);
    waka.then(function(stat) {
      var lenght = user.stats.length - 1;
      if(lenght >=0 && user.stats[lenght].day == today) {
        user.stats[lenght] = stat;
      } else {
        user.stats.push(stat);
      }
      db.users.update(
        {_id: mongo.helper.toObjectID(_id)},
        {$set: user},
        function (err, doc) {
          if (err) deferred.reject(err);

          deferred.resolve(user.stats);
        });

    });
  });
  return deferred.promise;
}

//Retrieve the last week's stats and save those missing
function fetchMissingWeekStats(_id) {
  var deferred = Q.defer();
  var conta = 0;
  var profile = getById(_id);
  profile.then(function (user) {
    //fetch stats from api
    var sevenDayStats = fetchSevenDay(user.apiKey);
    sevenDayStats.then(function (statsUpdated) {
      //if the user has not saved stats save all
      if (user.stats.length == 0) {
        for (var i = 0; i < 7; i++) {
          user.stats.push(statsUpdated[i]);
        }
      } else {
        if (Date.parse(statsUpdated[0].day).compareTo(Date.parse(user.stats[user.stats.length - 1].day)) == 1) {
          for (var i = 0; i < 7; i++) {
            user.stats.push(statsUpdated[i]);
          }
        } else {
          var first = -1;
          for (var i = user.stats.length - 2; i >= 0 && first == -1; i--) {
            if (Date.parse(statsUpdated[0].day).compareTo(Date.parse(user.stats[i].day)) == 1) {
              if (Date.parse(statsUpdated[0].day).compareTo(Date.parse(user.stats[i + 1].day)) == 0) {
                first = i + 1;
              } else {
                first = i;
              }
              user.stats.splice(i, 0, statsUpdated[0]);
              first++;
              conta++;
            }
          }
          if (first == -1) {
            user.stats.splice(0, 0, statsUpdated[0]);
            first = 1;
            conta++;
          }
          while (conta < 7 && first < user.stats.length) {
            if (Date.parse(statsUpdated[conta].day).compareTo(Date.parse(user.stats[first].day)) == 0) {
              conta++;
              first++;
            } else if (Date.parse(statsUpdated[conta].day).compareTo(Date.parse(user.stats[first].day)) == -1) {
              user.stats.splice(first, 0, statsUpdated[conta]);
              first++;
              conta++;
            } else {
              first++;
            }
          }
        }
      }
      db.users.update(
        {_id: mongo.helper.toObjectID(_id)},
        {$set: user},
        function (err, doc) {
          if (err) deferred.reject(err);

          deferred.resolve(user.stats);
        });
    })
  });
  return deferred.promise;
}

