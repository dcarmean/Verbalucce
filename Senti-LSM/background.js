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
  
 File: background.js
*/

// Debug Level: 0 - disable logging, 1 - error , 2 - warning, 3 - info, 4 - debug, 5 - log

debug.setLevel(3);  // Only display error, warning and info logging.

var CONTACTGROUPUNIT=100;
var verbalucceRunList = [];
var alltimeRunList = [];
var progressBar = 0;
var progressStep = 0;

chrome.runtime.onInstalled.addListener(function(details)
{
	$( "#dialog-confirm" ).dialog({
		  resizable: false,
		  height:140,
		  modal: true,
		  buttons: {
			"Accept": function() {
			  $( this ).dialog( "close" );
			},
			"Decline": function() {
			  $( this ).dialog( "close" );
			}
		  }
		});

	var r=confirm("Please review our Privacy Notice at verbalucce.appspot.com/privacy-notice.html and click OK to continue installation.");
	if (r==true)
	  {
	  x="You pressed OK!";
	  }
	else
	  {
		alert("Sorry!Bye!");
	  	chrome.management.uninstallSelf();
	  }
});

chrome.browserAction.setIcon({path:"notready.png"});
chrome.browserAction.setBadgeBackgroundColor({color:[217,70,70, 255]});
chrome.browserAction.setBadgeText({text:"Wait.."})

var db = new localStorageDB("localdb", localStorage);

if (!db.isNew())
{
	if (db.tableExists("relational_db"))
	{
		db.truncate("relational_db");
		db.commit();
	}
	else
	{
		db.createTable("relational_db", ["contact_id", "contact_info"]);
		db.commit();
	}
}
// Create Relational Dababase
else
{
	db.createTable("relational_db", ["contact_id", "contact_info"]);
	db.commit();
}

var accountInfo = {}

function getAccountInfo()
{
	try {
		chrome.identity.getAuthToken({'interactive': true}, function(token) {
				if (token) {
					accountInfo['access_token']=token;
				}
			});
	} catch(e) {
    debug.error(e);
  }
  return accountInfo;
}

try {
    chrome.identity.getAuthToken({'interactive': true}, function(token) {
	if (token) {
	accountInfo['access_token'] = token;
    // Create an XMLHttpRequest to get the email address
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if( xhr.readyState == 4 ) {
            if( xhr.status == 200 ) {
            var parseResult = JSON.parse(xhr.responseText);
            // The email address is located naw:
            accountInfo['email'] = parseResult["email"];       
	    
		    // Use POST to send data to server
		    jqxhr = $.ajax({
		        url: "https://verbalucce.appspot.com/cloudsqlcreateuseraccount",
		        type: "POST",
		        async:false,
		        cache: false,
		        data: {useremail:accountInfo['email']},
		        dataType:"json",
		        success: function(data){
					result = $.parseJSON(jqxhr.responseText);
		           }
		    });
			
			
			chrome.runtime.onMessage.addListener(
			  function(request, sender, sendResponse) {
				debug.debug(sender.tab ?
							"from a content script:" + sender.tab.url :
							"from the extension");
				if (request.kind == "accountInfo")
				  sendResponse(getAccountInfo());
			  });
  
  			chrome.browserAction.setBadgeText({text:"0%"})
			getContacts(token);

            }
        }
    }
    // Open it up as GET, POST didn't work for me for the userinfo
    xhr.open("GET","https://www.googleapis.com/oauth2/v1/userinfo",true);
    // Set the content & autherization 
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', "OAuth " + token);
    xhr.send(null);
	}
    });
  } catch(e) {
    debug.error(e);
  }
	
function GetNumEmailsSentToContacts(contactObjects, e)
{
	debug.debug("GetNumEmailsSentToContacts");

	var contactAddresses = []
	for(var i=0;i<contactObjects.length;i++){
		for(var u=0;u<contactObjects[i]['emails'].length;u++){
			contactAddresses.push(contactObjects[i]['emails'][u]);
		}
	}
	
	targets={'contacts':contactAddresses}
	
	// Use POST to send data to server
	jqxhr = $.ajax({
		url: "https://verbalucce.appspot.com/cloudsqlgetnumemailssenttocontacts",
		type: "POST",
		async:false,
		cache: false,
		data: {
				account:JSON.stringify(accountInfo),
				contacts:JSON.stringify(targets)
				},
		success: function(data){
			result = data;
			debug.debug("printing the 'result'");
			debug.debug(result);
			debug.debug(data);

			for(var i=0;i<contactObjects.length;i++){
				for(var u=0;u<contactObjects[i]['emails'].length;u++){
					var currEmail = contactObjects[i]['emails'][u];
					contactObjects[i]['numSent'].push(result[currEmail]);

				}
				debug.debug("inserting THIS object into the db");
				debug.debug(contactObjects[i]);

				db.insertOrUpdate("relational_db", {contact_id:contactObjects[i]['id']}, {contact_id:contactObjects[i]['id'], contact_info:contactObjects[i]});
			}

			db.commit();
			
			var contacts = db.query("relational_db");
			RunVerbalucceOnLoad(contacts)
			progressBar += progressStep
			progressBar = Math.round(progressBar);
			chrome.browserAction.setBadgeText({text:progressBar+"%"})
			
		},
		error: function (xhr, ajaxOptions, thrownError) {
	        debug.error(xhr.status);
	        debug.error(thrownError);
	    }
	});
}

// Get 1 year worth of data
function RunVerbalucceOnLoad(contacts)
{
	// Sort the contact group and pick the top 10 people to RunVerbalucce
	contacts.sort(function(a,b) {return (a.contact_info.numSent[0] < b.contact_info.numSent[0]) ? 1 : ((b.contact_info.numSent[0] < a.contact_info.numSent[0]) ? -1 : 0);});
	// run top 10 contacts for Verbalucce
	var unpopulatedContacts = []
	for (var i=0; i<10;i++)
	{
		if (unpopulatedContacts.indexOf(contacts[i].contact_info.emails[0])==-1
		&& verbalucceRunList.indexOf(contacts[i].contact_info.emails[0])==-1)
		{
			unpopulatedContacts.push(contacts[i].contact_info.emails[0]);
			verbalucceRunList.push(contacts[i].contact_info.emails[0]);
		}
	}
	
	if (unpopulatedContacts.length>0)
	{
		var now = new Date();
		var oneyearago = new Date(now.getFullYear()-1, now.getMonth(), now.getDate())
		var u_now = Math.floor(now.getTime()/1000);
		var u_oneyearago = Math.floor(oneyearago.getTime()/1000);
		
		RunVerbalucce3({'contacts':{'targets':unpopulatedContacts}, 
						'duration':{'starttime':u_oneyearago, 'endtime':u_now}
						});	
	}
}

// get contacts
function getContacts(token)
{		
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function()
	{
		if( xhr.readyState == 4 ) 
		{
			if( xhr.status == 200 ) 
			{
				var tempContacts = [];
				var emailsCount = 0;
				var parseResult = JSON.parse(xhr.responseText);
				var numGroups = parseResult['feed']['entry'].length/CONTACTGROUPUNIT;
				progressStep = 100/numGroups;
				
				for (var i = 0; i < parseResult['feed']['entry'].length; i++)
				{
					var entry = parseResult['feed']['entry'][i];
					var contact = 
						{
						 'Name'	:entry['title']['$t'],
						 'id'	:entry['id']['$t'],
						 'emails':[],
						 'numSent':[]
						};
					
					if (entry['gd$email'])
					{
						var emails = entry['gd$email'];
						for (var j = 0, email; email = emails[j]; j++) 
						{
							if(email['address'] != undefined){
								contact['emails'].push(email['address']);
							}
						}
						if(contact != undefined){
							tempContacts.push(contact);
							emailsCount += emails.length;
							debug.debug("emailsCount = " + emailsCount);
							if(emailsCount >= CONTACTGROUPUNIT){
								debug.debug("firing GetNumEmailsSentToContacts with " + tempContacts.length + " contacts");
								GetNumEmailsSentToContacts(tempContacts);
								tempContacts = [];
								emailsCount = 0;
							}
						}
					}
				}

				GetNumEmailsSentToContacts(tempContacts); //send it one more time for leftover emails from last 100
				tempContacts = [];
				
				chrome.browserAction.onClicked.addListener(function(activeTab)
				{
					var newURL = "interface2.html";
					chrome.tabs.create({ url: newURL });
				});
				
							
				chrome.browserAction.setIcon({path:"ready.png"});
				chrome.browserAction.setBadgeBackgroundColor({color:[196,214,128, 255]});
				chrome.browserAction.setBadgeText({text:"Ready"})
			}
		}
	}

		
	// Open it up as GET, POST didn't work for me for the userinfo
	xhr.open("GET","https://www.google.com/m8/feeds/contacts/default/full??v=3.0&max-results=9999&alt=json",true);
	// Set the content & autherization 
	xhr.setRequestHeader('Content-Type', 'application/json');

	xhr.setRequestHeader('Authorization', "OAuth " + token);
	xhr.send(null);	
}
