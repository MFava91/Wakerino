(function () {
  'use strict';

	/**
   * @ngdoc service
   * @name UserService
   * @description User service that provides basic operations for user
   */

  angular
      .module('app')
      .factory('UserService', Service);

  function Service($http, $q) {
    var service = {};

    service.GetCurrent = GetCurrent;
    service.GetAll = GetAll;
    service.GetById = GetById;
    service.GetByUsername = GetByUsername;
    service.Create = Create;
    service.Update = Update;
    service.Delete = Delete;

    service.CreateStat = CreateStat;
    service.UpdateMissingWeekStats = UpdateMissingWeekStats;
    service.UpdateApiKey = UpdateApiKey;

    return service;

    //Authentication

		/**
     * Returns the current user
     */
    function GetCurrent() {
        return $http.get('/api/users/current').then(handleSuccess, handleError);
    }

		/**
     * Returns all users
     */
    function GetAll() {
        return $http.get('/api/users').then(handleSuccess, handleError);
    }

		/**
     * Tries to find and return a user
     *
     * @param _id - id of the user to look for
     */
    function GetById(_id) {
        return $http.get('/api/users/' + _id).then(handleSuccess, handleError);
    }

		/**
     * Tries to find and return a user
     *
     * @param username - username of the user to look for
     */
    function GetByUsername(username) {
        return $http.get('/api/users/' + username).then(handleSuccess, handleError);
    }

		/**
     * Tries to create a new user
     * @param user - the user to create
     */
    function Create(user) {
        return $http.post('/api/users', user).then(handleSuccess, handleError);
    }

		/**
     * Updates the user's profile
     *
     * @param user - the user to update
     */
    function Update(user) {
        return $http.put('/api/users/' + user._id, user).then(handleSuccess, handleError);
    }

		/**
     * Tries to update the user's apiKey
     *
     * @param user - to user to update
     */
    function UpdateApiKey(user) {
        return $http.put('/api/users/apiKey/' + user._id, user).then(handleSuccess, handleError);
    }

		/**
     * Delete the user
     *
     * @param _id - id of the user to delete
     */
    function Delete(_id) {
        return $http.delete('/api/users/' + _id).then(handleSuccess, handleError);
    }

    //Stats

		/**
     * Tries to retrieve the user's statistics of today
     */
    function CreateStat() {
      return $http.post('/api/users/stats/fetch').then(handleSuccess, handleError);
    }

		/**
     * Tries to retrieve the last week's stats and fetches those missing
     * @constructor
     */
    function UpdateMissingWeekStats() {
      return $http.post('/api/users/stats/fetchWeek').then(handleSuccess, handleError);
    }


    // Private functions

    function handleSuccess(res) {
        return res.data;
    }

    function handleError(res) {
        return $q.reject(res.data);
    }
  }

})();
