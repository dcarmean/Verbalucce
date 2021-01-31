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
  
 File: verbalucce.js
*/
var contactsList = new Array();

var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var db = chrome.extension.getBackgroundPage().db;
var accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
var verbalucceRunList = chrome.extension.getBackgroundPage().verbalucceRunList;
var alltimeRunList = chrome.extension.getBackgroundPage().alltimeRunList;
var contacts = db.query("relational_db");
var output = document.getElementById('output');

// Visualize each contact's verbalucce data

for (var i = 0; i<contacts.length; i++) {
  var contact = contacts[i]['contact_info'];
  var div = document.createElement('div');
  var pName = document.createElement('p');
  var ulEmails = document.createElement('ul');
  var pVerbalucce = document.createElement('table');
  var pRow = document.createElement('tr');
  var pCol = document.createElement('td');
  var button = document.createElement('button');
  
  button.innerHTML = "Run Verbalucce";
  
  pVerbalucce.border = 1;
  
  if (contact['Name'] != "")
  {
	  pName.innerText = contact['Name'];
  }
  else
  {
	  pName.innerText = "Unknown"
  }
  
  div.appendChild(pName);
  //contactsList.push(contact['emails'][0]);

  for (var j = 0, email; email = contact['emails'][j]; j++) {
    var liEmail = document.createElement('li');
    liEmail.innerText = email;
    ulEmails.appendChild(liEmail);
	button.id = email;

	div.appendChild(button);
  }

  div.appendChild(ulEmails);
  //output.appendChild(div);
  
}

function getContactsList(){
	for (var i = 0; i<contacts.length; i++) {
		var contact = contacts[i]['contact_info'];
		
		if (contact['Name'] != "")
		{
			pName.innerText = contact['Name'];
		}
		else
		{
			pName.innerText = "Unknown"
		}

		contactsList.push(contact['emails'][0]);
	}
	return contactsList;
}


function logout() {
  chrome.extension.getBackgroundPage().logout();
  window.close();
}

function updateDisplay(result)
{
	verbalucce_result = result.verbalucce_result;
	data = []
	for (var i = 0; i < verbalucce_result.length; i++)
	{
		var r = verbalucce_result[i];
		var k = Object.keys(r.moodmap);
		for ( var j = 0; j < k.length; j++)
		{
			record = {};
			record['time'] 	= r.timestamp;
			record['species'] 	= k[j];
			record['count']		= r.moodmap[k[j]];
			data.push(record); 
		}
	}
			 
	var count_extent= d3.extent(data, function(d) {return d.count});
	var count_scale	= d3.scale.linear().range([height,0]).domain(count_extent);
	var count_axis 	= d3.svg.axis().scale(count_scale);
	d3.select(".y.axis")
		.call(count_axis)
		.attr("transform", "rotate(90)");
	
	var time_extent	= d3.extent(data, function(d) {return new Date(d.time*1000)});	
	var time_scale	= d3.time.scale().range([0,width]).domain(time_extent); 
	var time_axis 	= d3.svg.axis().scale(time_scale);
	d3.select(".x.axis")
		.call(time_axis);

    // Make the changes
	var p = svg.selectAll("dot").data(data)
	
	// UPDATE
  	// Update old elements as needed.
	p.attr("class","update")

	// ENTER
  	// Create new elements as needed.
	p.enter().append("circle")
		  .attr("class", "dot")
		  .attr("r", 3.5)
		  .attr("cx", function(d) { return time_scale(d.time*1000); })
		  .attr("cy", function(d) { return count_scale(d.count); })
		  .style("fill", function(d) { return color(d.species); });
		  
	// EXIT
	// Remove old elements as needed.
	p.exit().remove();
						
}


// searchAction = {'contacts':{'targets'}:[array of contacts],
//				   'duration':{'starttime':<unixtime>, 'endttime':<umixtime>}
function RunVerbalucce3(searchAction, e)
{
	contacts = searchAction['contacts'];
	duration = searchAction['duration'];
	debug.debug("RunVerbalucce3");
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	
	// Use POST to send data to server
	jqxhr = $.ajax({
		url: "https://verbalucce.appspot.com/runverbalucce3",
		type: "POST",
		async:true,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo),
				contacts:JSON.stringify(contacts),
				duration:JSON.stringify(duration)
				},
		dataType:"json",
		success: function(data){
		}
	});
}

function GetVerbalucceData(accountInfo, searchAction, e)
{
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	debug.debug("GetVerbalucceData");
	debug.debug(accountInfo);
	//debug.debug(e);
	
	// Use POST to send data to server
	jqxhr = $.ajax({
		url: "https://verbalucce.appspot.com/cloudsqlgetverbaluccedata",
		type: "POST",
		async:true,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo),
				action:JSON.stringify(searchAction)
				},
		dataType:"json",
		success: function(data){
			result = $.parseJSON(jqxhr.responseText);
			debug.debug("printing the 'result'");
			debug.debug(result);

			//useDataFromBackend(result);
		}
	});
}

// GetLanguageMarkers
// Input:startTime(unix time), endTime(unix time)
// If startTime==-1 and endTime==-1, it'll get the all time data
function GetLanguageMarkers(startTime, endTime, count, e)
{
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	debug.debug("GetLanguageMarker");
	debug.debug(startTime);
	debug.debug(endTime);
	debug.debug("count before call return " + count);
	
	// Use POST to send data to server
	$.ajax({
		url: "https://verbalucce.appspot.com/cloudsqlgetlanguagemarkers",
		type: "POST",
		async:true,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo),
				starttime:startTime,
				endtime  :endTime
				},
		dataType:"json",
		success: function(data){
			var result = data;
			debug.debug("printing the 'result' " + count);
			debug.debug(result);
			useDataFromBackend(result,count);
		},
		error: function (xhr, ajaxOptions, thrownError) {
	        debug.debug(xhr.status);
	        debug.debug(thrownError);
	    }
	});
}

function DeleteCloudSqlData(e)
{
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	debug.debug("attempting to delete data");
	jqxhr = $.ajax({
		url: "https://verbalucce.appspot.com/cloudsqldeleteuserdata",
		type: "POST",
		async:true,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo)
				},
		dataType:"json",
		success: function(data){
			result = data;
			debug.debug(result);
			debug.debug("deleted");
		}
	});
}

function GetEmailDataSchema()
{
	debug.debug("GetEmailDataSchema");
	var myData;
	
	$.ajax({
        url: 'https://verbalucce.appspot.com/cloudsqlgetemaildataschema',
        type: 'GET',
        async:false,
        success: function(data){
        	debug.debug(data);
        	myData = data;
        }
    });

    return myData; //can do this because we are running it async=false
}

function IsContactInDBOrRunVerbalucce3(contact)
{
	var now = new Date();
	var oneyearago = new Date(now.getFullYear(), now.getMonth(), now.getDay());
	var u_now = Math.floor(now.getTime()/1000);
	var u_oneyearago = Math.floor(oneyearago.getTime()/1000);
	debug.debug("Starting IsContactInDBOrRunVerbalucce3 at:", now, " for ", contact);
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	
	duration = {'starttime':u_oneyearago, 'endtime':u_now};
	jqxhr = $.ajax({
		url: "https://verbalucce.appspot.com/cloudsqliscontactindb",
		type: "POST",
		async:true,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo),
				contact:contact,
				duration:JSON.stringify(duration)
				},
		dataType:"json",
		success: function(data){
			result = data;

			if (verbalucceRunList.indexOf(contact)!=-1)
			{
				RunVerbalucce3({
								'contacts':{'targets':[contact]},
								'duration':{'starttime':-1, 'endtime':u_oneyearago}
								});
			}
			else if(!result){
				debug.debug("running RunVerbalucce3");
				RunVerbalucce3({
								'contacts':{'targets':[contact]},
								'duration':{'starttime':-1, 'endtime':-1}
								});
			}
			debug.debug(result);
		}
	});
}

function IsContactInDB(contact)
{
	debug.debug("Starting IsContactInDB for ", contact);
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	jqxhr = $.ajax({
		url: "https://verbalucce.appspot.com/cloudsqliscontactindb",
		type: "POST",
		async:true,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo),
				contact:contact
				},
		dataType:"json",
		success: function(data){
			return data;
		}
	});
}

// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
	accountInfo = chrome.extension.getBackgroundPage().getAccountInfo();
	//b = document.getElementById("deleteuserclouddata")
	//b.addEventListener('click', function(e){DeleteCloudSqlData(accountInfo, e);});
});


