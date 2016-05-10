(function () {
	'use strict';

	angular
		.module('app')
		.controller('Account.IndexController', Controller);

	/**
	 * @ngdoc controller
	 * @name Account.IndexController
	 * @description the controller that manages the user's profile
	 */
	function Controller($window, UserService, FlashService) {
		var vm = this;

		vm.user = null;
		vm.updateForm = null;
		vm.saveUser = saveUser;
		vm.deleteUser = deleteUser;
		vm.changeApiKey = changeApiKey;

		initController();

		/**
		 * Controller initialization
		 */
		function initController() {
			// get current user
			UserService.GetCurrent().then(function (user) {
				vm.user = user;
			});
			componentHandler.upgradeAllRegistered();
		}

		/**
		 * Update user profile
		 */
		function saveUser() {
			if (vm.updateForm.$valid) {
				UserService.Update(vm.user)
					.then(function () {
						FlashService.Success('User updated');
					})
					.catch(function (error) {
						FlashService.Error(error);
					});
			} else {
				FlashService.Error('Some field missing');
			}
		}

		/**
		 * Delete user from database
		 */
		function deleteUser() {
			UserService.Delete(vm.user._id)
				.then(function () {
					// log user out
					$window.location = '/login';
				})
				.catch(function (error) {
					FlashService.Error(error);
				});
		}

		/**
		 * Update user's apikey
		 */
		function changeApiKey() {
			if(vm.changeApiKeyForm.$valid) {
				UserService.UpdateApiKey(vm.user)
					.then(function () {
						vm.user.apiKey = vm.user.newApiKey;
						var dialogUpdateApikey = document.querySelector('#updateApiKey');
						dialogUpdateApikey.close();
						FlashService.Success('ApiKey updated');
					})
					.catch(function (error) {
						FlashService.Error(error);
					});
			} else {
				FlashService.Error('ApiKey field empty');
			}
		}
	}
})();
