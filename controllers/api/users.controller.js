var config = require('config.json');
var express = require('express');
var router = express.Router();
var userService = require('services/user.service');

// routes
router.post('/authenticate', authenticateUser);
router.post('/register', registerUser);
router.get('/current', getCurrentUser);
router.put('/:_id', updateUser);
router.put('/apiKey/:_id', updateUserApiKey);
router.delete('/:_id', deleteUser);

router.post('/stats/fetch', createStat);
router.post('/stats/fetchWeek', fetchMissingWeekStats);

module.exports = router;


//authentication

/**
 * Tries to authenticate the user
 *
 * @param {Object} req - 'req.body' contains the user to authenticate
 * @param {Object} res - if successful return token otherwise error 401
 */
function authenticateUser(req, res) {
    userService.authenticate(req.body.username, req.body.password)
        .then(function (token) {
            if (token) {
                // authentication successful
                res.send({ token: token });
            } else {
                // authentication failed
                res.sendStatus(401);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

/**
 * Tries to register a new user
 *
 * @param {Object} req - 'req.body' contains the user to register
 * @param {Object} res - if successful 200 otherwise error 400
 */
function registerUser(req, res) {
    userService.create(req.body)
        .then(function () {
            res.sendStatus(200);
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

/**
 * Returns the current user
 *
 * @param {Object} req - 'req.user.sub' contains the user _id
 * @param {Object} res - if successful return the current user otherwise error 404
 */
function getCurrentUser(req, res) {
    userService.getById(req.user.sub)
        .then(function (user) {
            if (user) {
                res.send(user);
            } else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

/**
 * Tries to update user's profile
 *
 * @param req - 'req.useer' contains the user
 * @param res - if successful return 200 otherwise error 400 or 401
 */
function updateUser(req, res) {
    var userId = req.user.sub;
    if (req.params._id !== userId) {
        // can only update own account
        return res.status(401).send('You can only update your own account');
    }

    userService.update(userId, req.body)
        .then(function () {
            res.sendStatus(200);
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

/**
 * Tries to update user's apiKey
 *
 * @param req - 'req.useer' contains the user
 * @param res - if successful return 200 otherwise error 400 or 401
 */
function updateUserApiKey(req, res) {
  var userId = req.user.sub;
  if (req.params._id !== userId) {
    // can only update own account
    return res.status(401).send('You can only update your own account');
  }

  userService.updateApiKey(userId, req.body)
    .then(function () {
      res.sendStatus(200);
    })
    .catch(function (err) {
      res.status(400).send(err);
    });
}

/**
 * Delete a user
 *
 * @param req - 'req.user.sub' contains the user id
 * @param res - if successful return 200 otherwise error 400 or 401
 */
function deleteUser(req, res) {
    var userId = req.user.sub;
    if (req.params._id !== userId) {
        // can only delete own account
        return res.status(401).send('You can only delete your own account');
    }

    userService.delete(userId)
        .then(function () {
            res.sendStatus(200);
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

//stats

/**
 * Tries to retrieves today's stats
 *
 * @param req - 'req.user.sub' contains the user id
 * @param res - if successful return the user's stat of today otherwise error 400
 */
function createStat(req, res) {
  userService.createStat(req.user.sub)
    .then(function (userStats) {
      res.status(200).send(userStats);
    })
    .catch(function (err) {
      res.status(400).send(err);
    });
}

/**
 * Tries to retrieves the last week's stats and fetches those missing
 *
 * @param req - 'req.user.sub' contains the user id
 * @param res - if successful return the user's stat updated, otherwise error 400
 */
function fetchMissingWeekStats(req, res) {
  userService.fetchMissingWeekStats(req.user.sub)
    .then(function (userWeekStats) {
      res.status(200).send(userWeekStats);
    })
    .catch(function (err) {
      res.status(400).send(err);
    });
}

