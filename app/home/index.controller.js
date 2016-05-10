(function () {
  'use strict';

  /**
   * @ngdoc controller
   * @name Home.IndexController
   * @description the controller that manages the user's stats
   */

  angular
    .module('app')
    .controller('Home.IndexController', Controller);

  function Controller(UserService) {
    var vm = this;
    var chartStatsHours;
    var charLabel;
    var generalChart;

    /**
     * Selected user
     * @type {object}
     */
    vm.user = null;

    /**
     * Selected user stats
     * @type {object}
     */
    vm.stats = null;

    /**
     * Number of selected days
     * @type {number}
     */
    vm.nDays = 7;

    vm.fetchTodayStat = fetchTodayStat;
    vm.fetchMissingWeekStats = fetchMissingWeekStats;
    vm.dateRange = dateRange;


    initController();

    $(document).ready(function() {
      chartMaxHeight();
    });
    window.onresize = function() {
      chartMaxHeight();
    };

    /**
     * Controller initialization
     */
    function initController() {
      // get current user
      UserService.GetCurrent().then(function (user) {
        vm.user = user;
        vm.stats = user.stats;
        initChart();
      });
    }

    /**
     * Main chart initialization
     */
    function initChart() {
      if(generalChart) {
        generalChart.destroy();
      }
      var c = document.getElementById("generalChart");
      var ctx = c.getContext('2d');
      var gradient = ctx.createLinearGradient(0.000, 150.000, 300.000, 150.000);
      gradient.addColorStop(0.306, 'rgba(210, 255, 82, 0.40)');
      gradient.addColorStop(1.000, 'rgba(145, 232, 66, 0.80)');
      initChartData();

      var data = {
        labels: charLabel,
        datasets: [
          {
            label: "Work hours",
            fill: true,
            lineTension: 0.1,
            backgroundColor: "rgba(255, 64, 129, 0.2)",
            borderColor: "rgba(255, 64, 129, 1)",
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgba(255, 64, 129, 1)",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgba(255, 64, 129, 1)",
            pointHoverBorderWidth: 0.5,
            pointRadius: 1,
            pointHitRadius: 10,
            data: chartStatsHours,
            yAxisID: "y-axis-0"
          }]
      };

      generalChart = new Chart(ctx, {
        type: 'line',
        data: data
      });
    }

    /**
     * Creating objects containing statistics of days required
     */
    function initChartData() {
      chartStatsHours = [];
      charLabel = [];
      if(vm.nDays <= vm.stats.length) {
        if(Date.today().compareTo(Date.parse(vm.stats[vm.stats.length-1].day)) === 0) {
          charLabel.push(Date.today().toString('MM-dd'));
          chartStatsHours.push(vm.stats[vm.stats.length-1].hours + '.' + vm.stats[vm.stats.length-1].minutes);
        }
        for(var nDays = 1, j = vm.stats.length - 2; nDays < vm.nDays; nDays++) {
          if(Date.parse('-' + nDays).compareTo(Date.parse(vm.stats[j].day)) === 0) {
            chartStatsHours.unshift(vm.stats[j].hours + '.' + vm.stats[j].minutes);
            j--;
          } else {
            chartStatsHours.unshift([]);
          }
          charLabel.unshift(Date.parse('-' + nDays.toString()).toString('MM-dd'));
        }
      } else {
        for(var nDays = vm.nDays- 1, j = 0; nDays > 0; nDays--) {
          if(Date.parse('-' + nDays).compareTo(Date.parse(vm.stats[j].day)) == 0) {
            chartStatsHours.push(vm.stats[j].hours + '.' + vm.stats[j].minutes);
            j++;
          } else {
            chartStatsHours.push([]);
          }
          charLabel.push(Date.parse('-' + nDays.toString()).toString('MM-dd'));
        }
        if(Date.today().compareTo(Date.parse(vm.stats[vm.stats.length-1].day)) === 0) {
          charLabel.push(Date.today().toString('MM-dd'));
          chartStatsHours.push(vm.stats[vm.stats.length-1].hours + '.' + vm.stats[vm.stats.length-1].minutes);
        }
      }
    }

    /**
     * Return the number of days between two dates
     *
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {number}
     */
    function getDaysBetweenTwoDates(startDate, endDate) {
      var startDateObj = new Date(startDate),
        endDateObj = new Date(endDate),
        totalYear = endDateObj.getFullYear() - startDateObj.getFullYear(),
        totalMonth = endDateObj.getMonth() - startDateObj.getMonth(),
        totalDay = endDateObj.getDate() - startDateObj.getDate();

      if (totalDay < 0) {
        totalMonth--;
        totalDay += new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 0).getDate();
      }
      return 360 * totalYear + 30 * totalMonth + totalDay;
    }

    /**
     * Updates the number of days to display in the chart
     *
     * @param range - Numbers of days
     */
    function dateRange(range) {
      if(range === 'All') {
        vm.nDays = getDaysBetweenTwoDates(Date.parse(vm.stats[0].day).toString(), Date.parse(vm.stats[vm.stats.length-1].day).toString());
      } else {
        vm.nDays = range;
      }
      initChart();
    }

    /**
     * Retrieves today's stats
     */
    function fetchTodayStat() {
      UserService.CreateStat().then(function(userStats) {
        vm.stats = userStats;
        initChart();
      });
    }

    /**
     * Check the last week's stats and fetches those missing
     */
    function fetchMissingWeekStats() {
      UserService.UpdateMissingWeekStats().then(function(userStats) {
        vm.stats = userStats;
        initChart();
      });
    }

		/**
     * Sets the generalChat's max-height property depending on the size of the window
     */
    function chartMaxHeight() {
      $('#generalChart').css('max-height', window.innerHeight - 355 + 'px');
    }
  }


})();