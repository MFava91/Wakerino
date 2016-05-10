(function () {
    'use strict';

    angular
        .module('app')
        .factory('FlashService', Service);

    function Service($rootScope) {
        var service = {};

        service.Success = Success;
        service.Error = Error;

        initService();

        return service;

        function initService() {
            $rootScope.$on('$locationChangeStart', function () {
                clearFlashMessage();
            });

            function clearFlashMessage() {
                var flash = $rootScope.flash;
                if (flash) {
                    if (!flash.keepAfterLocationChange) {
                        delete $rootScope.flash;
                    } else {
                        // only keep for a single location change
                        flash.keepAfterLocationChange = false;
                    }
                }
            }
        }

        function Success(message, keepAfterLocationChange) {
            toastMessage(message);
        }

        function Error(message, keepAfterLocationChange) {
            toastMessage(message);
        }

        function toastMessage(message) {
            var snackbarContainer = document.querySelector('#toast-error');
            var data = {message: message};
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
        }
    }

})();