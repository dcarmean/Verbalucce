/*
 Copyright (c) 2013, Intel Corporation
  
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
    http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License
  
 File: viz2.js
*/

var theirData = [];
var myData = [];
var num;
var numOfData = parseInt(Math.random()*10) + 5; //this basically is "how many months to show"
var midGraphSpacer = 1;
var startMonth; //take out later
var startTime;
var endMonth; //take out later
var endTime;
var year = 2013;
var endYear;
var dataBounds = 5;

var graphShown = false;

var margin = {top: 16, right: 16, bottom: 16, left: 60};

var tempTheirData = [];
var tempMyData = [];

//updates our viz data array with the object array coming from GetLanguageMarkers
function updateRawData(whichData){
    var data = [];
    for(var i=0;i<num;i++){
        data.push(new Array);
        for(var u=0;u<numOfData;u++){
            for(var w=0;w<whichData.length;w++){
                if(whichData[w].personIndex == i && whichData[w].monthIndex == u){
                    var val = new Object();
                    val.value = whichData[w]['values'][selectedData];
                    val.person = i;
                    val.opacity = 1;
                    data[i].push(val);
                    //debug.debug("we have a match at " + i + " and " + u + " with value " + val.value);
                }
            }
        }
    }

    return data;
}

//define bounds and bar sizes
var width = ($(window).width()) - margin.left - margin.right,
    height = ($(window).height()/2) - margin.top - margin.bottom;

//resize function to keep everything dynamic to differing screen sizes
function resize(){
    //debug.debug("resizing");
    width = ($(window).width()) - margin.left - margin.right;
    height = ($(window).height()/2) - margin.top - margin.bottom;
    //debug.debug("width=" + width + " and height=" + height);

    svg //update the svg size for dynamic scaling
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top);

    //call update for now
    update();
}

var x; //the global x scale
var y; //the global y scale
var xAxisScale; //the global xAxis scale
var yAxisScale; //the global yAxis scale

function rescale(){
    //set the x scale
    x = d3.scale.ordinal()
        .domain(d3.range(numOfData))
        .rangeRoundBands([0, width], 0.35, 0.1);

    //merge the data so we can get a max from d3.max()
    var mergedData = [];
    mergedData.push(d3.merge(theirData));
    mergedData.push(d3.merge(myData));
    mergedData = d3.merge(mergedData);
    for(var i=0;i<mergedData.length;i++){ //now loop through mergeData so we can just grab the .value of each object
        mergedData[i] = mergedData[i].value;
    }

    //calculate the y min and max
    var max = d3.max(mergedData);
    var min = d3.min(mergedData);
    dataBounds = max >= Math.abs(min) ? max : Math.abs(min);
    if(dataBounds <= 2 || isNaN(dataBounds)){
        dataBounds = 2;
    }
    debug.debug("dataBounds = " + dataBounds);

    //set the y scale
    y = d3.scale.linear()
        //.domain([0,d3.max(mergedData)])
        .domain([-1*dataBounds,dataBounds])
        .range([(height) - midGraphSpacer,0])
        .nice();

    //set the scale for the x axis
    /*if(endMonth < startMonth && endMonth != undefined && startMonth != undefined){ //temporary check to make sure we aren't moving back in time, this is not good enough!
        endMonth += 12;
    }*/

    //conditional here for checking average or month-to-month
    if(numOfData == 1 && (startTime == null || endTime == null)){ //this is an all time aggregation call
        xAxisScale = d3.scale.ordinal()
            .domain(["All Time"])
            .rangeRoundBands([0,width], 0.25, 0.1);
    }
    else if(numOfData == 1 && startTime != null && endTime != null){
        var format = d3.time.format("%B %Y");
        xAxisScale = d3.scale.ordinal()
            .domain([format(new Date(startTime.getFullYear(),startTime.getMonth(),startTime.getDate())) + " - " + format(new Date(endTime.getFullYear(),endTime.getMonth(),endTime.getDate()))])
            .rangeRoundBands([0,width], 0.25, 0.1);
    }
    else{
        xAxisScale = d3.scale.ordinal()
            .domain(d3.time.months(startTime, endTime))
            .rangeRoundBands([0, width], 0.35, 0.1);
    }

    /*yAxisScale = d3.scale.ordinal()
        .domain(["low","average","high"])
        .range([(height)-midGraphSpacer,0]);*/
    yAxisScale = y;
}

//create the svg and add it to the DOM
debug.debug("creating the svg");
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top);

var container = svg.append("g").attr("class", "container")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var bars = container.append("g").attr("class","bars");

/**UPDATETHEM***********************************************/
function updateThem(){
    theirData = updateRawData(tempTheirData); //here temporarily

    //make an update the scales in case we got new data
    //rescale();

    var colorMap = d3.scale.linear()
        .domain([0, num - 1])
        .range(["#EF4036", "#91D4F2"]);

    //DATA JOIN
    //Heavily influenced from - http://bl.ocks.org/mbostock/3943967
    var layers = bars.selectAll(".layerThem")
        .data(theirData);

    layers.enter().append("g")
        .attr("class", function(d,i){ return "layer layerThem person"+i; });

    layers
        .style("fill", function(d, i) { return colorMap(i); })
        .style("fill-opacity",0)
        .style("stroke", function(d,i) { return colorMap(i); })
        .style("stroke-opacity",0);

    var rect = layers.selectAll("rect")
        .data(function(d) { return d; });

    rect.enter().append("rect") //create the new ones that don't exist with zero'd attributes
        .attr("y",height/2)
        .attr("height",0)
        .attr("fill-opacity",0);

    //debug.debug("updating rectangles");

    rect //now update it all!
        .on("mouseover", function(d,i){
            //debug.debug(this.parentNode);
            var parent = this.parentNode;
            var parentClass = d3.select(parent).attr("class").split(" ")[2];
            d3.selectAll(".layer").filter(function(d,i){
                return (this !== parent && d3.select(this).attr("class").split(" ")[2] != parentClass);
            }).selectAll("rect")
                .transition()
                //.style("stroke-opacity",0.075)
                .style("fill-opacity",0.075);

            //highlight the proper person from the "people" index
            var personIndex = d3.select(this).data()[0].person;
            debug.debug("mouseOver person " + personIndex);
            $("#people .option").each(function(i){
                if(i != personIndex){
                    $(this).stop().fadeTo(250,0.2);
                }
            });

            //highlight the proper description tags
            var themColor = d3.select(d3.selectAll(".layerThem")[0][personIndex]).style("fill");
            var meColor = d3.select(d3.selectAll(".layerMe")[0][personIndex]).style("fill");
            d3.select("#themToMe").transition().style("background-color",themColor);
            d3.select("#meToThem").transition().style("background-color",meColor);
        })
        .on("mouseout", function(d,i){
            var parent = this.parentNode;
            d3.selectAll(".layer").selectAll("rect")
                .transition()
                //.style("stroke-opacity",0.85)
                .style("fill-opacity",function(d){ return d.opacity; });

            var personIndex = d3.select(this).data()[0].person;
            debug.debug("mouseOver person " + personIndex);
            $("#people .option").each(function(i){
                if(i != personIndex){
                    $(this).stop().fadeTo(250,1);
                }
            });

            //unhighlight the proper description tag
            //var themColor = d3.select(".layerThem").style("fill");
            //var meColor = d3.select(".layerMe").style("fill");
            d3.select("#themToMe").transition().style("background-color","#404040");
            d3.select("#meToThem").transition().style("background-color","#b0b0b0");
        })
        .transition()
        .attr("x", function(d, i, j) { return (x(i) + x.rangeBand() / num * j) + ((x.rangeBand()/num)/6); })
        .attr("height", function(d){ return Math.abs(y(d.value) - y(0)); })
        .attr("y", function(d){ return y(Math.max(0, d.value)); })
        .attr("width", (x.rangeBand() / num)-((x.rangeBand()/num)/2))
        //.style("stroke-opacity",0.85)
        .style("fill-opacity",function(d){ return d.opacity; });

    //EXIT
    layers //a single person
        .exit()
        .transition()
        .attr("y",height/2)
        .attr("height",0)
        //.style("opacity",0)
        .remove();
    rect //data inside layers
        .exit()
        .transition()
        .attr("y",height/2)
        .attr("height",0)
        //.style("opacity",0)
        .remove();
}
/***********************************************UPDATETHEM**/

/**UPDATEME*************************************************/
function updateMe(){
    myData = updateRawData(tempMyData); //here temporarily

    //make an update the scales in case we got new data
    //rescale();

    var colorMap = d3.scale.linear()
        .domain([0, num - 1])
        .range(["#FFC2BF", "#cef0ff"]);

    //DATA JOIN
    //Heavily influenced from - http://bl.ocks.org/mbostock/3943967
    var layers = bars.selectAll(".layerMe")
        .data(myData);

    layers.enter().append("g")
        .attr("class", function(d,i){ return "layer layerMe person"+i; });

    layers
        .style("fill", function(d, i) { return colorMap(i); })
        .style("fill-opacity",0)
        .style("stroke", function(d,i) { return colorMap(i); })
        .style("stroke-opacity",0);

    var rect = layers.selectAll("rect")
        .data(function(d) { return d; });

    rect.enter().append("rect") //create the new ones that don't exist with zero'd attributes
        .attr("y",height/2 + midGraphSpacer)
        .attr("height",0)
        .attr("fill-opacity",0);

    rect //now update it all!
        .on("mouseover", function(d,i){
            //debug.debug(this.parentNode);
            var parent = this.parentNode;
            var parentClass = d3.select(parent).attr("class").split(" ")[2];
            d3.selectAll(".layer").filter(function(d,i){ //all that ARE NOT parent
                return (this !== parent && d3.select(this).attr("class").split(" ")[2] != parentClass);
            }).selectAll("rect") 
                .transition()
                //.style("stroke-opacity",0.075)
                .style("fill-opacity",0.075);

            //hightlight the proper person in the "people" module
            var personIndex = d3.select(this).data()[0].person;
            debug.debug("mouseOver person " + personIndex);
            $("#people .option").each(function(i){
                if(i != personIndex){
                    $(this).stop().fadeTo(250,0.2);
                }
            });

            //highlight the proper description tags
            var themColor = d3.select(d3.selectAll(".layerThem")[0][personIndex]).style("fill");
            var meColor = d3.select(d3.selectAll(".layerMe")[0][personIndex]).style("fill");
            d3.select("#themToMe").transition().style("background-color",themColor);
            d3.select("#meToThem").transition().style("background-color",meColor);
        })
        .on("mouseout", function(d,i){
            var parent = this.parentNode;
            d3.selectAll(".layer").selectAll("rect")
                .transition()
                //.style("stroke-opacity",0.85)
                .style("fill-opacity",function(d){ return d.opacity; });

            var personIndex = d3.select(this).data()[0].person;
            //debug.debug("mouseLeaving person " + personIndex);
            $("#people .option").each(function(i){
                if(i != personIndex){
                    $(this).stop().fadeTo(250,1);
                }
            });

            //unhighlight the proper description tag
            //var themColor = d3.select(".layerThem").style("fill");
            //var meColor = d3.select(".layerMe").style("fill");
            d3.select("#themToMe").transition().style("background-color","#404040");
            d3.select("#meToThem").transition().style("background-color","#b0b0b0");
            
        })
        .transition()
        .attr("x", function(d, i, j) { return (x(i) + x.rangeBand() / num * j) + ((x.rangeBand()/num)/3); })
        .attr("height", function(d){ return Math.abs(y(d.value) - y(0)); })
        .attr("y", function(d){ return y(Math.max(0, d.value)); })
        .attr("width", (x.rangeBand() / num)-((x.rangeBand()/num)/2))
        //.style("stroke-opacity",0.85)
        .style("fill-opacity",function(d){ return d.opacity; });

    //EXIT
    layers //a single person
        .exit()
        .transition()
        .attr("y",height/2 + midGraphSpacer)
        .attr("height",0)
        .style("opacity",0)
        .remove();
    rect //data inside layers
        .exit()
        .transition()
        .attr("y",height/2 + midGraphSpacer)
        .attr("height",0)
        .style("opacity",0)
        .remove();
}
/*************************************************UPDATEME**/

function update(callBack){

    //THERE IS A BUG WITH TIMING HERE
    rescale();

    if(numOfData == 1){
        xAxis = d3.svg.axis()
            .scale(xAxisScale)
            .ticks(1)
            .tickSize(4,0);
    }
    else{
        xAxis = d3.svg.axis()
            .scale(xAxisScale)
            //.orient("bottom")
            .ticks(d3.time.months)
            .tickSize(4, 0)
            .tickFormat(d3.time.format('%B %Y'));
    }
    yAxis = d3.svg.axis()
        .scale(yAxisScale)
        .ticks(5)
        .tickSize(4,0)
        .orient("left")
        .tickValues([-1*dataBounds,((-1*dataBounds)/2),0,dataBounds/2,dataBounds]);

    var xAxisDrawn = container.select(".x.axis")
        .transition()
        .attr("transform", "translate(0," + height/2 + ")")
        .call(xAxis);

    var yAxisDrawn = container.select(".y.axis")
        .transition()
        .attr("transform", "translate(0,0)")
        .call(yAxis);

    yAxisDrawn.selectAll(".tick").each(function(d,i){
        if(d == dataBounds){
            d3.select(this)
                /*.transition()
                .style("fill","red")*/
                .selectAll("text")
                    .text("High ("+Math.round(d*10)/10+")");
        }
        else if(d == -1*dataBounds){
            d3.select(this)
                /*.transition()
                .style("fill","blue")*/
                .selectAll("text")
                    .text("Low ("+Math.round(d*10)/10+")");
        }
        else if(d == 0){
            d3.select(this)
                .selectAll("text")
                    .text("Average");
        }
        else{
            d3.select(this).transition().style("opacity",0.5);
        }
    });

    //if(d3.selectAll(".layerThem rect")[0].length <= 0 && d3.selectAll(".layerMe rect")[0].length <= 0 || num == 0){
    var dataCount = 0;
    if(theirData.length > 0){
        for(var i=0;i<theirData.length;i++){
            if(theirData[i].length > 0){
                for(var u=0;u<theirData[i].length;u++){
                    dataCount++;
                }
            }
        }
    }


    if(dataCount <= 0){
        //debug.debug("no bars");
        /*d3.selectAll(".axis").transition().delay(250)
            .style("opacity",0);
        */
        d3.selectAll(".container").transition().delay(250).style("opacity",0);
        d3.select(".graphDescription").transition().style("opacity",0);

        graphShown = false;
    }
    else{
        //debug.debug("bars");
        d3.selectAll('.container').transition().delay(250).style("opacity",1);
        d3.select(".graphDescription").transition().style("opacity",1);
        d3.select("#themToMe").transition().style("background-color","#404040");
        d3.select("#meToThem").transition().style("background-color","#b0b0b0");

        graphShown = true;
    }

    //update the options for correct background color
    setTimeout(function(){ //delay it because of a stupid .stop() jQuery issue with fading contacts in and out for "selection highlighing"
        d3.selectAll(".layerThem").each(function(d,i){
            var currColor = d3.select(this).style("fill");
            $(".people.option").eq(i).animate({
                backgroundColor: currColor,
                opacity: 1,
            },{duration:250,queue:false});
        });
    },250);

    updateMe();
    updateThem();

    if(callBack != false){
        setTimeout(function(){
            update(false);
            debug.debug("calling update again on a timer");
        },250);
    }
}

update();

var xAxis;
var yAxis;

container.append("g")
        .attr("class","x axis")
        .attr("transform", "translate(0," + height/2 + ")")
        .call(xAxis);

container.append("g")
        .attr("class","y axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);

