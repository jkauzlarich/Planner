var app = angular.module('app', []);

if (!String.prototype.decodeHTML) {
    String.prototype.decodeHTML = function () {
        return this.replace(/&apos;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&');
    };
}

app.controller("calendarCtrl", function ($scope, $timeout, $sce) {
    d3.selection.prototype.moveToBack = function() {
        return this.each(function() {
            var firstChild = this.parentNode.firstChild;
            if (firstChild) {
                this.parentNode.insertBefore(this, firstChild);
            }
        });
    };

    $('[data-toggle="tooltip"]').tooltip({trigger: 'hover'});

    $(window).on('resize', function () { $scope.createChart(); });

    // initialize page by getting the spreadsheet data from the server
    $('#loader').modal().show();

    var url = "MITRE Project Planner.xlsx";
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function(e) {
        var arraybuffer = oReq.response;

        // convert data to binary string
        var data = new Uint8Array(arraybuffer);
        var arr = new Array();
        for (var i = 0; i != data.length; ++i)
            arr[i] = String.fromCharCode(data[i]);
        var bstr = arr.join("");

        createData(XLSX.read(bstr, {type:"binary"}));
        $('#loader').modal('hide');
        $scope.$apply();
    };

    oReq.send();

    $scope.listFilter = 'all';
    $scope.showOngoingActivities = false;

    var startDate;
    var activities;
    function createData(ss) {
        // check to see if spreadsheet has a title tab for a custom title
        var sheet = ss.Sheets['Title'];
        $scope.title = sheet ? sheet['A1'].w : 'Project Planner';

        sheet = ss.Sheets['Filter Validation Lists'];
        $scope.label1 = sheet['C1'].w;
        $scope.label2 = sheet['A1'].w;
        $scope.label3 = sheet['B1'].w;

        sheet = ss.Sheets['Data'];
        var index = 2;

        // start a month prior to current date
        var currentDate = new Date();
        var startMonth = currentDate.getMonth() >= 1 ? currentDate.getMonth() : 12;
        var startYear = (startMonth === 12 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()).toString().substr(2, 2);
        var monthDayMap = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31};
        var startDay = Math.min(monthDayMap[startMonth], currentDate.getDate());
        startDate = startMonth + '/' + startDay + '/' + startYear;
        console.log(startDate);

        // create activities data
        activities = [];
        index = 1;
        var currentDate = new Date();
        $scope.currentDays = $scope.dateToDays((currentDate.getMonth()+1)+'/'+currentDate.getDate()+'/'+(currentDate.getYear()-100));

        while (sheet['A'+(++index)]) {
            var filter1 = [];
            if (sheet['G'+index]) filter1.push(sheet['G'+index].w);
            if (sheet['H'+index]) filter1.push(sheet['H'+index].w);
            if (sheet['I'+index]) filter1.push(sheet['I'+index].w);
            if (sheet['J'+index]) filter1.push(sheet['J'+index].w);
            if (sheet['K'+index]) filter1.push(sheet['K'+index].w);
            if (sheet['L'+index]) filter1.push(sheet['L'+index].w);
            if (sheet['M'+index]) filter1.push(sheet['M'+index].w);
            if (sheet['N'+index]) filter1.push(sheet['N'+index].w);
            if (sheet['O'+index]) filter1.push(sheet['O'+index].w);
            if (sheet['P'+index]) filter1.push(sheet['P'+index].w);

            var filter2 = [];
            if (sheet['Q'+index]) filter2.push(sheet['Q'+index].w);
            if (sheet['R'+index]) filter2.push(sheet['R'+index].w);
            if (sheet['S'+index]) filter2.push(sheet['S'+index].w);
            if (sheet['T'+index]) filter2.push(sheet['T'+index].w);
            if (sheet['U'+index]) filter2.push(sheet['U'+index].w);

            var processes = [];
            if (sheet['V'+index]) processes.push(sheet['V'+index].h);
            if (sheet['W'+index]) processes.push(sheet['W'+index].h);
            if (sheet['X'+index]) processes.push(sheet['X'+index].h);
            if (!processes.length) processes = ['Other'];

            processes.forEach(function (process) {
                activities.push({
                    id: index - 2,
                    activity: sheet['A'+index].h.decodeHTML(),
                    description: sheet['B'+index] ? sheet['B'+index].h : null,
                    descriptionHtml: sheet['B'+index] ? $sce.trustAsHtml(sheet['B'+index].h.decodeHTML()) : null,
                    critical: sheet['C'+index] ? sheet['C'+index].h === 'yes' : false,
                    startDate: sheet['D'+index] ? sheet['D'+index].w : null,
                    endDate: sheet['E'+index] ? sheet['E'+index].w : null,
                    start: sheet['D'+index] ? $scope.dateToDays(sheet['D'+index].w) : null,
                    end: sheet['E'+index] ? $scope.dateToDays(sheet['E'+index].w) : null,
                    milestoneDate: sheet['F'+index] ? sheet['F'+index].w : null,
                    milestone: sheet['F'+index] ? $scope.dateToDays(sheet['F'+index].w) : null,
                    startTime: null,
                    endTime: null,
                    location: null,
                    locationHtml: null,
                    filter1: filter1,
                    filter2: filter2,
                    process: process,
                    actions: null,
                    externalLink: sheet['Y'+index] ? sheet['Y'+index].w : null,
                    contact: sheet['Z'+index] ? sheet['Z'+index].w : null,
                    email: sheet['AA'+index] ? sheet['AA'+index].w : null
                });

                var daysOut = (activities[activities.length-1].start !== null ? activities[activities.length-1].start : activities[activities.length-1].milestone) - $scope.currentDays;
                var continuous = activities[activities.length-1].start !== null && activities[activities.length-1].start === 0 && activities[activities.length-1].end > 363;
                if (activities[activities.length-1].start === null && activities[activities.length-1].milestone === null) continuous = true;
                if (continuous) activities[activities.length-1].ongoing = true;
                activities[activities.length-1].color = continuous ? 'darkgrey' : daysOut <= 30 ? 'red' : daysOut <= 90 ? 'orange' : daysOut <= 180 ? 'yellow' : 'green';
            });
        }

        $scope.processes = [];
        activities.forEach(function (activity) {
            if ($scope.processes.indexOf(activity.process) === -1) $scope.processes.push(activity.process);
        });
        $scope.processes.sort();

        $scope.filter1s = [];
        activities.forEach(function (activity) {
            activity.filter1.forEach(function (filter1) {
                if ($scope.filter1s.indexOf(filter1) === -1) $scope.filter1s.push(filter1);
            });
        });
        $scope.filter1s.sort();

        $scope.filter2s = [];
        activities.forEach(function (activity) {
            activity.filter2.forEach(function (filter2) {
                if ($scope.filter2s.indexOf(filter2) === -1) $scope.filter2s.push(filter2);
            });
        });
        $scope.filter2s.sort();

        // create list of weeks and months based on current data
        var maxDay = d3.max(activities, function (d) {
            return d.end ? d.end : d.milestone;
        });
        $scope.weeks = [];
        $scope.months = [];

        var formattedDate = $scope.daysToDate($scope.currentDays, true);
        if (new Date(formattedDate).getDate() !== 1) $scope.months.push(formattedDate.split('-')[0]+'-'+formattedDate.split('-')[2]);

        for (var i = $scope.currentDays; i <= maxDay; i++) {
            formattedDate = $scope.daysToDate(i, true);
            var date = new Date(formattedDate);
            if (date.getDate() === 1) $scope.months.push(formattedDate.split('-')[0]+'-'+formattedDate.split('-')[2]);
            if (date.getDay() === 1) $scope.weeks.push(formattedDate);
        }

        $scope.listFilter = 'all';
        $scope.week = $scope.weeks[0];
        $scope.month = $scope.months[0];

        $scope.createChart(true);
    }

    // these variables need to be accessed from outside of $scope.createChart()
    var axisScale;

    $scope.createChart = function (init) {
        // create copy of activities
        $scope.activities = activities.slice().filter(function (d) {
            return !$scope.searchString || $scope.searchString === '' || d.activity.toLowerCase().indexOf($scope.searchString.toLowerCase()) > -1 ||
                (d.description && d.description.toLowerCase().indexOf($scope.searchString.toLowerCase()) > -1);
        }).filter(function (d) {
            if (!$scope.processFilter && !$scope.processFilter2) return true;
            return ($scope.processFilter && d.process === $scope.processFilter) || ($scope.processFilter2 && d.process === $scope.processFilter2);
        }).filter(function (d) {
            return !$scope.filter1 || d.filter1.indexOf($scope.filter1) > -1;
        }).filter(function (d) {
            return !$scope.filter2 || d.filter2.indexOf($scope.filter2) > -1;
        }).filter(function (d) {
            return d.critical || !$scope.showOnlyCritical;
        });

        $scope.activities = $scope.activities.sort(function (a, b) {
            var aDate = a.start !== null ? a.start : a.milestone,
                bDate = b.start !== null ? b.start : b.milestone;
            return a.process > b.process ? 1 : b.process > a.process ? -1 :
                aDate > bDate ? 1 : bDate > aDate ? -1 : 0;
        });
        var processes = [];
        $scope.activities.forEach(function (d, i) {
            d.index = i;
            if (processes.length === 0 || processes[processes.length-1].process !== d.process) {
                processes.push({process: d.process, count: 1, total: i});
            }
            else processes[processes.length - 1].count++;
        });

        $scope.activitiesSorted = $scope.activities.sort(function (a, b) {
            var aDate = a.start !== null ? a.start : a.milestone,
                bDate = b.start !== null ? b.start : b.milestone;
            return aDate > bDate ? 1 : bDate > aDate ? -1 : 0;
        });

        // group activites in left panel by process
        $scope.activityBins = [{}, {}, {}, {}, {}];
        $scope.activities.forEach(function (d) {
            // exclude past activities
            if ((d.milestone && d.milestone < $scope.currentDays) || (d.end && d.end < $scope.currentDays)) return;

            var index = d.color === 'darkgrey' ? 0 : d.color === 'red' ? 1 : d.color === 'orange' ? 2 : d.color === 'yellow' ? 3 : 4;
            $scope.activityBins[index][d.process] || ($scope.activityBins[index][d.process] = []);
            $scope.activityBins[index][d.process].push(d);
        });

        // set up svg
        d3.selectAll('#calendar-container .chart-svg').remove();
        d3.select('#chart-container').remove();

        // set left padding to max text width
        var maxWidth = 0;
        processes.forEach(function(p) {
            if (ivml.getTextWidthInPixels(p.process, '"Helvetica Neue", Helvetica, Arial, sans-serif', 16) > maxWidth)
                maxWidth = ivml.getTextWidthInPixels(p.process, '"Helvetica Neue", Helvetica, Arial, sans-serif', 16);
        });

        var margin = {top: 42, right: 45, bottom: 10, left: maxWidth+10},
            height = $(window).height() - 104 - margin.top - margin.bottom,
            width = $(window).width() - margin.left - margin.right - $('#calendar-control-panel').width();

        $('#calendar-control-panel').height($(window).height() - 98);
        $('#calendar-control-panel').css({'max-height': $(window).height() - 98, overflow: 'auto'});
        $('#list-container, #calendar-view').css({'max-height': $(window).height() - 98, overflow: 'auto'});
        $('#calendar').width($(window).width() - $('#calendar-control-panel').width());

        var nodeHeight = 30;

        var axisSvg = d3.select('#calendar-container')
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('width', $(window).width() - 18)
            .attr('height', 43);

        var svg = d3.select("#calendar-container")
            .append('div')
            .attr('id', 'chart-container')
            .attr('style', 'height: '+(height)+'px; overflow: auto;')
            .append("svg")
            .attr('class', 'chart-svg')
            .attr("width", $(window).width() - 18 - $('#calendar-control-panel').width())
            .attr("height", $scope.activities.length*nodeHeight)
            .style('overflow-y', 'auto');

        svg.append("g");

        // x-axis: from 0 to max number of days
        // change axis text to be corresponding date
        d3.selectAll('#calendar-container .axis').remove();

        var xMax = Math.round(7 * 30.4);

        axisScale = d3.scale.linear()
            .domain([0, xMax])
            .range([margin.left+10, width+margin.left]);

        var axisValues = [];
        for (var i = 0; i < xMax; i++) {
            var d = new Date(Date.parse(startDate));
            d.setDate(d.getDate() + i);
            if (d.getDate() === 1) axisValues.push(i);
        }

        var xAxis = d3.svg.axis()
            .scale(axisScale)
            .tickFormat(d3.format('.0f'))
            .tickValues(axisValues)
            .orient("top");

        axisSvg.append("g")
            .call(xAxis)
            .attr("class", "axis")
            .attr('id', 'months')
            .attr("transform",
                "translate(" + 0+", "+margin.top+")");

        axisValues = [];
        for (i = 0; i < xMax; i++) {
            var d = new Date(Date.parse(startDate));
            d.setDate(d.getDate() + i);
            if ((d.getMonth() === 10 || d.getMonth() === 1 || d.getMonth() === 4 || d.getMonth() === 7) && d.getDate() === 15) axisValues.push(i);
        }

        var xAxis2 = d3.svg.axis()
            .scale(axisScale)
            .tickFormat(d3.format('.0f'))
            .tickValues(axisValues)
            .orient("top");

        axisSvg.append("g")
            .call(xAxis2)
            .attr('id', 'quarters')
            .attr("class", "axis")
            .attr("transform",
                "translate(" + 0+", "+(margin.top - 20)+")");

        d3.selectAll('#quarters line, #quarters path').style('stroke', 'none');

        // change ticks from days to dates
        function changeAxisToDates() {
            $('#calendar-container .axis text').text(function() {
                var date = $scope.daysToDate(parseInt($(this).text()));

                // for low res, only display quarter start months to avoid text overlap
                if (width <= 1000 && date.indexOf('-') > -1 && ['Jan', 'Apr', 'Jul', 'Oct'].indexOf(date.split('-')[0]) === -1) return '';

                return date;
            });
        }

        changeAxisToDates();

        // minor axis lines
        d3.selectAll('#months text').each(function(d) {
            svg.append('line')
                .attr('class', 'minor-axis-line')
                .attr('x1', axisScale(d))
                .attr('y1', 0)
                .attr('x2', axisScale(d))
                .attr('y2', margin.top+margin.bottom+$scope.activities.length*nodeHeight-20)
                .style('stroke-width', 1)
                .style('stroke', function () {
                    var date = $scope.daysToDate(d);
                    return date.indexOf('Oct') > -1 || date.indexOf('Jan') > -1 || date.indexOf('Apr') > -1 || date.indexOf('Jul') > -1 ? 'grey' : 'lightgrey';
                });
        });

        svg.selectAll('.process-divider')
            .data(processes)
            .enter()
            .append('line')
            .attr('x1', axisScale(axisScale.domain()[0]))
            .attr('x2', axisScale(axisScale.domain()[1]))
            .attr('y1', function(d) {return (d.total + d.count) * nodeHeight;})
            .attr('y2', function(d) {return (d.total + d.count) * nodeHeight;})
            .style('stroke-width', 1)
            .style('stroke', 'black');

        // add gantt chart rectangles
        var nodes = svg.selectAll('.activity-node')
            .data($scope.activities)
            .enter()
            .append('g')
            .attr('class', 'activity-node')
            .attr('transform', function(d) {
                return d.start !== null ? 'translate('+axisScale(d.start)+','+(d.index*nodeHeight + 4)+')' :
                    d.milestone !== null ? 'translate('+axisScale(d.milestone)+','+(d.index*nodeHeight + 4)+')' : 'translate('+axisScale(axisScale.domain()[0])+','+(d.index*nodeHeight + 4)+')';
            });

        height = nodeHeight-8;

        // var tip = d3.tip().attr('class', 'd3-tip').html(function(d) {
        //     var additionalText = '';
        //     return d.activity + additionalText;
        // }).offset([-8, 0]);
        // svg.call(tip);

        var processTip = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return $scope.processDescriptions[d.process];
        }).offset([-8, 0]).direction('e').offset([0, 10]);
        svg.call(processTip);

        nodes
            .append('rect')
            .attr('class', function (d) {
                return 'activity-rect ' + d.color;
            })
            .attr('x', 0)
            .attr('width', function (d) {
                return d.ongoing ? axisScale(axisScale.domain()[1]) : d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
            })
            .attr('height', height)
            .style('cursor', 'pointer')
            // .on('mouseover', function (d) {
            //     d3.event && tip.show(d);
            // })
            // .on('mouseout', function (d) {
            //     tip.hide();
            // })
            .on('click', function(d) {
                $scope.activity = d;
                $('#activity-modal').modal().show();
                $scope.$apply();
            });

        nodes
            .append('text')
            .attr('class', 'activity-text')
            .text(function (d) {
                var rectWidth = d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
                var textWidth = ivml.getTextWidthInPixels(d.activity, '"Helvetica Neue", Helvetica, Arial, sans-serif', 14)
                return textWidth + 5 > rectWidth ? '←' + d.activity : d.activity;
            })
            .attr('dy', 16)
            .attr('dx', function (d) {
                // tsee if text fits in box (with current zoom)
                var rectWidth = d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
                var textWidth = ivml.getTextWidthInPixels(d.activity, '"Helvetica Neue", Helvetica, Arial, sans-serif', 14)
                return textWidth + 5 > rectWidth ? rectWidth + (d.milestone ? 10 : 0) : 5;
            })
            .style('fill', function (d) {
                var rectWidth = d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
                var textWidth = ivml.getTextWidthInPixels(d.activity, '"Helvetica Neue", Helvetica, Arial, sans-serif', 14)
                return d.color === 'yellow' || textWidth + 5 > rectWidth ? 'black' : 'white';
            })
            .style('cursor', 'pointer')
            .on('click', function(d) {
                $scope.activity = d;
                $('#activity-modal').modal().show();
                $scope.$apply();
            });

        nodes
            .append('path')
            .attr('class', function (d) {
                return 'activity-diamond ' + d.color;
            })
            .attr('d', function (d) {
                return d.milestone === null ? 'M 0 0' :
                    'M 0 '+height/2+' '+height/2+' 0 '+height+' '+height/2+' '+height/2+' '+height+' 0 '+height/2
            })
            .attr('transform', 'translate(-'+height/2+', 0)')
            .style('cursor', 'pointer')
            // .on('mouseover', function (d) {
            //     d3.event && tip.show(d);
            // })
            // .on('mouseout', function (d) {
            //     tip.hide();
            // })
            .on('click', function(d) {
                $scope.activity = d;
                $('#activity-modal').modal().show();
                $scope.$apply();
            });

        // place a semi-opaque rectangle over dates in the past
        svg.append('rect')
            .attr('class', 'past-rect')
            .attr('x', axisScale(0))
            .attr('y', 0)
            .attr('width', axisScale($scope.currentDays) - axisScale(axisScale.domain()[0]))
            .attr('height', nodeHeight * $scope.activities.length)
            .style('fill', 'lightgrey')
            .style('opacity', '0.5')
            .style('pointer-events', 'none');

        svg.selectAll('.out-of-bounds').remove();
        svg.append('rect')
            .attr('class', 'out-of-bounds')
            .attr('width', margin.left + 10)
            .attr('height', $scope.activities.length*nodeHeight)
            .style('fill', 'white');
        svg.append('rect')
            .attr('class', 'out-of-bounds')
            .attr('x', width + margin.left)
            .attr('width', margin.right)
            .attr('height', $scope.activities.length*nodeHeight)
            .style('fill', 'white');

        // rows: one for each activity

        svg.selectAll('.activity').remove();
        // labels are activity
        svg.selectAll(".activity")
            .data(processes)
            .enter()
            .append("text")
            .attr("class", "activity")
            .text(function(d){return d.process})
            .attr("x", margin.left)
            .attr("y",function(d){return (d.total + d.count/2)*nodeHeight + 7;})
            .attr('text-anchor', 'end')
            .on('mouseover', function (d) {
                if ($scope.processDescriptions[d.process]) processTip.show(d);
            })
            .on('mouseout', function (d) {
                processTip.hide();
            });

        // add pan/zoom behavior
        var zoom = d3.behavior.zoom()
            .x(axisScale)
            .scaleExtent([0.3, 16])
            .on("zoom", function () {
                svg.selectAll('.activity-node')
                    .attr('transform', function(d, i) {
                        return d.start !== null ? 'translate('+axisScale(d.start)+','+(d.index*nodeHeight + 4)+')' :
                            d.milestone !== null ? 'translate('+axisScale(d.milestone)+','+(d.index*nodeHeight + 4)+')' : 'translate('+axisScale(axisScale.domain()[0])+','+(d.index*nodeHeight + 4)+')';
                    });

                svg.selectAll('.activity-rect')
                    .attr('x', function (d) {
                        return d.ongoing ? 0 : Math.max(0, axisScale(axisScale.domain()[0]) - axisScale(d.start));
                    })
                    .attr('width', function(d) {
                        return d.ongoing ? axisScale(axisScale.domain()[1]) - axisScale(axisScale.domain()[0]) :
                            Math.min(Math.max(0, axisScale(axisScale.domain()[1]) - axisScale(d.start)), axisScale(d.end) - axisScale(d.start),
                            Math.max(0, axisScale(d.end) - axisScale(axisScale.domain()[0])), axisScale(axisScale.domain()[1]) - axisScale(axisScale.domain()[0]));
                    });

                svg.selectAll('.activity-diamond')
                    .attr('d', function (d) {
                        return d.milestone === null || d.milestone < axisScale.domain()[0] || d.milestone > axisScale.domain()[1] ? 'M 0 0' :
                            'M 0 '+height/2+' '+height/2+' 0 '+height+' '+height/2+' '+height/2+' '+height+' 0 '+height/2
                    });

                svg.selectAll('.past-rect')
                    .attr('x', axisScale(axisScale.domain()[0]))
                    .attr('y', 0)
                    .attr('width', Math.max(0, axisScale($scope.currentDays) - axisScale(axisScale.domain()[0])))
                    .attr('height', nodeHeight * $scope.activities.length)
                    .style('fill', 'lightgrey')
                    .style('opacity', '0.5');

                svg.selectAll('.activity-text')
                    .text(function (d) {
                        var rectWidth = d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
                        var textWidth = ivml.getTextWidthInPixels(d.activity, '"Helvetica Neue", Helvetica, Arial, sans-serif', 14)
                        return textWidth + 5 > rectWidth ? '←' + d.activity : d.activity;
                    })
                    .attr('dy', 16)
                    .attr('dx', function (d) {
                        // tsee if text fits in box (with current zoom)
                        var rectWidth = d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
                        var textWidth = ivml.getTextWidthInPixels(d.activity, '"Helvetica Neue", Helvetica, Arial, sans-serif', 14)
                        return textWidth + 5 > rectWidth ? rectWidth + (d.milestone ? 10 : 0) : 5;
                    })
                    .style('fill', function (d) {
                        var rectWidth = d.start === null || d.end === null ? 0 : axisScale(d.end) - axisScale(d.start);
                        var textWidth = ivml.getTextWidthInPixels(d.activity, '"Helvetica Neue", Helvetica, Arial, sans-serif', 14)
                        return d.color === 'yellow' || textWidth + 5 > rectWidth ? 'black' : 'white';
                    });

                axisValues = [];
                var scale = zoom.scale();
                for (var i = Math.ceil(axisScale.domain()[0]); i < Math.floor(axisScale.domain()[1]); i++) {
                    var d = new Date(Date.parse(startDate));
                    d.setDate(d.getDate() + i);
                    if (d.getDate() === 1) axisValues.push(i);
                }

                var axisValues2 = [];
                for (i = Math.ceil(axisScale.domain()[0]); i < Math.floor(axisScale.domain()[1]); i++) {
                    var d = new Date(Date.parse(startDate));
                    d.setDate(d.getDate() + i);
                    if ((d.getMonth() === 10 || d.getMonth() === 1 || d.getMonth() === 4 || d.getMonth() === 7) && d.getDate() === 15) axisValues2.push(i);
                }

                d3.selectAll("#months").call(xAxis.tickValues(axisValues));
                d3.selectAll("#quarters").call(xAxis2.tickValues(axisValues2));

                d3.selectAll('#quarters line, #quarters path').style('stroke', 'none');

                svg.selectAll('.minor-axis-line').remove();
                d3.selectAll('#months text').each(function(d) {
                    svg.append('line')
                        .attr('class', 'minor-axis-line')
                        .attr('x1', axisScale(d))
                        .attr('y1', 0)
                        .attr('x2', axisScale(d))
                        .attr('y2', margin.top + margin.bottom + $scope.activities.length * nodeHeight - 20)
                        .style('stroke-width', 1)
                        .style('stroke', function () {
                            var date = $scope.daysToDate(d);
                            return date.indexOf('Oct') > -1 || date.indexOf('Jan') > -1 || date.indexOf('Apr') > -1 || date.indexOf('Jul') > -1 ? 'grey' : 'lightgrey';
                        });
                });
                svg.selectAll('.minor-axis-line').moveToBack();

                changeAxisToDates();
            });

        svg.call(zoom);

        $scope.filterList();

        $scope.resetNewActivityForm();
    };

    $scope.showActivityModal = function (activity) {
        $scope.activity = activity;
        $('#activity-modal').modal().show();
    };

    $scope.filterList = function () {
        $scope.activitiesSortedFiltered = $scope.activitiesSorted.filter(function (d) {
            //if (!$scope.showOngoingActivities && d.color === 'darkgrey') return false;
            if ($scope.listFilter === 'all') return true;

            var startDays = $scope.dateToDays($scope.listFilter === 'week' ?  $scope.week.replace(/-/g, '/') : $scope.month.split('-')[0]+'/1/'+$scope.month.split('-')[1]);
            var monthDayMap = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31};
            var endDays = $scope.listFilter === 'week' ? startDays + 6 : startDays + monthDayMap[$scope.month.split('-')[0]] - 1;

            return ((d.start >= startDays && d.start <= endDays) || (d.start < startDays && d.end >= startDays)) ||
                (d.milestone && d.milestone >= startDays && d.milestone <= endDays) || ($scope.showOngoingActivities && d.ongoing);
        });
    };

    $scope.exportToOutlook = function (activity) {
        var cal = ics();
        var startDate = activity.startDate ? activity.startDate : activity.milestoneDate,
            endDate = activity.endDate ? activity.endDate : activity.milestoneDate;

        if (!activity.endTime) {
            var newDate = new Date(activity.milestoneDate ? activity.milestoneDate : activity.endDate);
            newDate.setDate(newDate.getDate() + 1);
            endDate = (newDate.getMonth()+1) + '/' + (newDate.getDate()) + '/' + (newDate.getFullYear() - 2000);
        }

        cal.addEvent(activity.activity, activity.description && activity.description !== 'Optional' ? activity.description.replace(/&#x000d;&#x000a;/g, ' * ') : '',
            activity.location ? activity.location.replace(/&#x000d;&#x000a;/g, ' * ') : '', fixDate(startDate) + (activity.startTime ? ' ' + activity.startTime : ''), fixDate(endDate.toString()) + (activity.endTime ? ' ' + activity.endTime : ''));
        cal.download(activity.activity);

        function fixDate(date) {
            return date.split('/')[0] + '/' + date.split('/')[1] + '/20' + date.split('/')[2];
        }
    };

    $scope.exportTableToExcel = function () {
        var workbook = XLSX.utils.book_new();

        var data = [];

        $scope.activitiesSortedFiltered.forEach(function (d) {
            if ((d.end && d.end >= $scope.currentDays) || d.milestone >= $scope.currentDays || ($scope.showOngoingActivities && d.ongoing)) {
                data.push({
                    Activity: d.activity,
                    'Start Date': d.startDate ? d.startDate : d.milestoneDate ? d.milestoneDate : '-',
                    'End Date': d.endDate ? d.endDate : d.milestoneDate ? d.milestoneDate : '-',
                    'Preparatory Actions': d.actions
                });
            }
        });

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Calendar');

        var name = $scope.listFilter === 'all' ? 'all_activities' : $scope.listFilter === 'week' ? 'activities_week_of_' + $scope.week : 'activities_month_of_' + $scope.month;
        XLSX.writeFile(workbook, '' + name + '.xlsx');
    };

    $scope.resetNewActivityForm = function () {
        $scope.numOrgs = 0;
        $scope.numRoles = 0;
        $scope.newActivityForm = {
            name: '',
            description: '',
            preparatoryActions: '',
            critical: false,
            startDate: '',
            endDate: '',
            milestoneDate: '',
            timeType: 'allDay',
            startHours: 12,
            startMinutes: '00',
            startAmPm: 'AM',
            endHours: 12,
            endMinutes: '00',
            endAmPm: 'AM',
            location: '',
            center1: 'All',
            center2: null,
            process1: 'Other',
            process2: null,
            process3: null,
            role1: null,
            role2: null,
            role3: null,
            role4: null,
            role5: null,
            roleLOE1: 'Low',
            roleLOE2: 'Low',
            roleLOE3: 'Low',
            roleLOE4: 'Low',
            roleLOE5: 'Low',
            organization1: null,
            organization2: null,
            organization3: null,
            organization4: null,
            organization5: null,
            organizationLOE1: 'Low',
            organizationLOE2: 'Low',
            organizationLOE3: 'Low',
            organizationLOE4: 'Low',
            organizationLOE5: 'Low',
            connection1: null,
            connection2: null,
            externalLink: '',
            contact: '',
            email: '',
            notes: ''
        };
    };

    $scope.showNewActivityModal = function () {
        $timeout(function () {
            $('#add-activity-modal').modal().show();
        });
    };

    $scope.isValidDate = function (date) {
        return !date || date === '' || (date.split('/').length === 3 && parseInt(date.split('/')[0]) <= 12
            && parseInt(date.split('/')[1]) <= 31 && parseInt(date.split('/')[2]) >= 2018 && parseInt(date.split('/')[2]) <= 2020);
    };

    $scope.submitNewActivity = function () {
        $('#loader').modal().show();

        $scope.newActivityForm.connection1 = $scope.newActivityForm.connection1 ? $scope.newActivityForm.connection1.activity : null;
        $scope.newActivityForm.connection2 = $scope.newActivityForm.connection2 ? $scope.newActivityForm.connection2.activity : null;

        api.sendNewActivity($scope.newActivityForm).then(function (results) {
            $('#loader').modal('hide');
        });
    };


    // Utility functions--------------------------------

    $scope.daysToDate = function (days, fullDate) {
        if (days < 0) return '';

        var day = parseInt(startDate.split('/')[1]), month = parseInt(startDate.split('/')[0]), year = parseInt(startDate.split('/')[2]);
        var monthDayMap = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31};
        for (var i = 0; i < days; i++) {
            if (day === monthDayMap[month]) {
                day = 1;
                month++;
                if (month === 13) {
                    month = 1;
                    year++;
                }
            }
            else day++;
        }

        //return month+'/'+day+'/'+year;
        var monthMap = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'};
        return fullDate ? month+'-'+day+'-20'+year :
            day <= 2 ? monthMap[month]+'-'+year :
            month === 11 ? 'Q1' : month === 2 ? 'Q2' : month === 5 ? 'Q3' : 'Q4';
    };

    $scope.dateToDays = function (date) {
        var day = parseInt(startDate.split('/')[1]), month = parseInt(startDate.split('/')[0]), year = parseInt(startDate.split('/')[2]);
        var monthDayMap = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31};
        var days = 0;
        for (var i = 0; i < 10000; i++) {
            if (month+'/'+day+'/'+year === date || month+'/'+day+'/20'+year === date) break;

            if (day === monthDayMap[month]) {
                day = 1;
                month++;
                if (month === 13) {
                    month = 1;
                    year++;
                }
            }
            else day++;

            days++;
        }

        return days;
    };

    function inQuarter(q, d) {
        if (d.ongoing) return true;

        var year = q.substr(q.length - 2);
        var quarterStartDays = $scope.dateToDays(q.indexOf('Q1') > -1 ? '10/1/'+ (parseInt(year) - 1) :
            q.indexOf('Q2') > -1 ? '1/1/'+year : q.indexOf('Q3') > -1 ? '4/1/'+year :
            '7/1/'+year);
        var quarterEndDays = $scope.dateToDays(q.indexOf('Q1') > -1 ? '12/31/'+ (parseInt(year) - 1) :
            q.indexOf('Q2') > -1 ? '3/31/'+year : q.indexOf('Q3') > -1 ? '6/30/'+year :
            '9/30/'+year);

        // for milestone, return whether the milestone date is in quarter and if it is after current date
        if (d.milestone) {
            return d.milestone >= $scope.currentDays && d.milestone >= quarterStartDays && d.milestone <= quarterEndDays;
        }

        return d.end >= $scope.currentDays && d.start <= quarterEndDays && d.end >= quarterStartDays;
    }

    function inMonth(m, d) {
        var month = m.split('-')[0], year = m.split('-')[1];
        var monthStartDays = $scope.dateToDays(month + '/1/' + year);
        var dayMap = [null, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var monthEndDays = $scope.dateToDays(month + '/' + dayMap[parseInt(month)] + '/' + year);

        if (d.milestone) {
            return d.milestone >= $scope.currentDays && d.milestone >= monthStartDays && d.milestone <= monthEndDays;
        }

        return d.end >= $scope.currentDays && d.start <= monthEndDays && d.end >= monthStartDays;
    }

    function inWeek(w, d) {
        var month = w.split('-')[0], day = w.split('-')[1], year = w.split('-')[2];
        var weekStartDays = $scope.dateToDays(month + '/' + day + '/' + year);
        var dayMap = [null, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var weedEndDays = weekStartDays + 6;

        if (d.milestone) {
            return d.milestone >= $scope.currentDays && d.milestone >= weekStartDays && d.milestone <= weedEndDays;
        }

        return d.end >= $scope.currentDays && d.start <= weedEndDays && d.end >= weekStartDays;
    }
});