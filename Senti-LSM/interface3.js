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
  
 File: interface3.js
*/
/***interface3.js***
	TODO:
	- build a modular system for how a module should react when something is added/removed from it
	- develop end-user feedback for
	---- waiting for data response of email in the database
	---- canceling the search because an email selected doesn't exist in the database yet
	- don't make a new request if ONLY datatype is changed, because all data based on other parameters are already there, a request is unnecessary
	- selecting/deselecting/selecting again same month in either time module causes a bug
******************/

// Debug Level: 0 - disable logging, 1 - error , 2 - warning, 3 - info, 4 - debug, 5 - log
debug.setLevel(2);  // Only display error, warning and info logging.

/**jQuery extension, found from stackoverflow**********************************************/
/***********http://stackoverflow.com/questions/3562493/jquery-insert-div-as-certain-index**/
jQuery.fn.insertAt = function(index, element) { //used to insert an element in a specific position rather than simply appendTo()
	var lastIndex = this.children().size();
	if (index < 0) {
		index = Math.max(0, lastIndex + 1 + index);
	}
	this.append(element);
	if (index < lastIndex) {
		this.children().eq(index).before(this.children().last());
	}
	return this;
}
/**********************************************jQuery extension, found from stackoverflow**/

/**modules************************************************************/
var modules = new Array(); //eventually build this as a hashmap like options

//hashmap functions
function returnContactsList(){ //function for hashmap
	//var contacts = new Array();
	var contactsFromServer = db.query("relational_db"); //get it from verbalucce.js function
	var emailsAndNumSent = [];
	for(var i=0;i<contactsFromServer.length;i++){
		for(var u=0;u<contactsFromServer[i]['contact_info']['emails'].length;u++){
			emailsAndNumSent.push({"email":contactsFromServer[i]['contact_info']['emails'][u], "numSent":contactsFromServer[i]['contact_info']['numSent'][u]})
		}		
	}
	//contacts.sort();

	function compare(a,b) {
	if (a.numSent > b.numSent)
		return -1;
	if (a.numSent < b.numSent);
		return 1;
		return 0;
	}

	emailsAndNumSent.sort(compare); //sort by numSent key in the contacts object (most emails sent go first)
	debug.debug(emailsAndNumSent);

	var myContacts = [];
	for(var i=0;i<emailsAndNumSent.length;i++){
		myContacts.push(emailsAndNumSent[i]['email']);
	}

	var uniqueContacts = [];
	var contactTracker = []; //used to keep track of just the contact ID
	/*found this from Stackoverflow*********/
	$.each(myContacts, function(i, el){
	    if($.inArray(el, contactTracker) === -1) {
	    	contactTracker.push(el);
	    	uniqueContacts.push({"display":el,"id":el,"value":0});
		}
	});
	/***************************************/

	debug.debug("getting number of emails sent to contact");
	//GetNumEmailsSentToContacts(uniqueContacts); //this will get the number of emails for all contacts - not used yet
	return uniqueContacts;
}

function returnDataList(){ //function for hashmap
	var dummyData = [{"display":"big words","id":"zBigWords","value":0},
						{"display":"relational language","id":"zFemale","value":0},
						{"display":"stressed, angry words","id":"zHighNeg","value":0},
						{"display":"excited, happy words","id":"zHighPos","value":0},
						{"display":"casual language","id":"zInformality","value":0},
						{"display":"sad, gloomy words","id":"zLowNeg","value":0},
						{"display":"calm, serene words","id":"zLowPos","value":0},
						{"display":"swear words","id":"zSwear","value":0},
						{"display":"total words","id":"zTotalWords","value":0},
						{"display":"words per sentence","id":"zWordsPerSentence","value":0}];
	return dummyData;
}

function returnTimeList(){ //function for hashmap
	var dummyTime = [{"display":"the last month","id":"month","value":1},
						{"display":"the last 3 months","id":"3-months","value":3},
						{"display":"the last 6 months","id":"6-months","value":6},
						{"display":"the last year","id":"year","value":12},
						{"display":"all time","id":"all-time","value":-1}];
	return dummyTime;
}

function returnViewList(){
	var dummyView = [{"display":"by month","id":"month-groups","value":1},
						{"display":"in aggregate","id":"aggregations","value":0}];
	return dummyView;
}

//list of options for each module comes from a hashmap defined below, with an associated function for each key/value to get the values...
var options = {
	'people': returnContactsList(),
	'data': returnDataList(),
	'time': returnTimeList(),
	'view': returnViewList()
};

var defaultOptions = {
	'people': null,
	'data':null,
	'time': 2,
	'view': 1
};

var maxSelectedOptions = [5,1,1,1]; //this will limit the number of options we can select for each module... this needs to somehow be reworked, again for modularity and flexibility

var selectedData;
/************************************************************modules**/

var aboutPageHTML = "<span><b>About Verbalucce's Analytics (historical visualization)</b><br><br>"+
"Verbalucce is based on incoming and outgoing Gmails sent directly between you and another person. Group emails are not included.<br><br>"+
"The higher the bar, the higher the score on a given communication style relative to the emails retrieved in the database.  The more that you and your contact emailed each other during that month, the greater confidence you can have in the score since it is based on more information.  If you don't see a bar for a given time period, your Gmail communication was infrequent or showed an average style of communication during that time.<br><br>"+
"For any visualization, hover over a bar or email address to highlight the pattern of communication between you and your contact.<br><br>"+
"<br><b>What Communication Styles Can I See?</b><br><br>"+
"<i>Casual</i><br>"+
"Higher scores indicate a more informal and conversational style.<br><br>"+
"<i>Relational</i><br>"+
"Higher scores indicate a more personal and emotional style.<br><br>"+
"<i>Excited, Happy</i><br>"+
"Higher scores indicate a greater use of positive, high energy words.<br><br>"+
"<i>Stressed, Angry</i><br>"+
"Higher scores indicate a greater use of negative, high energy words.<br><br>"+
"<i>Calm, Serene</i><br>"+
"Higher scores indicate frequent use of positive, low energy words.<br><br>"+
"<i>Sad, Gloomy</i><br>"+
"Higher scores indicate frequent use of negative, low energy words.<br><br>"+
"<i>Total Words</i><br>"+
"Higher scores indicate more words.<br><br>"+
"<i>Words per Sentence</i><br>"+
"Higher scores indicate more words per sentence.<br><br>"+
"<i>Swear</i><br>"+
"Higher scores indicate a greater use of swear words.<br><br>"+
"<i>Big Words</i><br>"+
"Higher scores indicate a greater use of words greater than six characters.<br><br>"+
"<br><b>How Do I Use Verbalucce?</b><br><br>"+
"1. The home screen shows you a menu of visualizations you can see.<br><br>"+
"<img src='1-HomeScreen.png' width='100%'/><br><br>"+
"2. Select from each drop-down menu.  You can pick one or multiple contacts.<br><br>"+
"<img src='2-SelectNames.png' width='100%'/><br><br>"+
"3. Hover over one contact and one month, or over an email address, or over the email sent to you/email sent by you to focus on a contact.<br><br>"+
"<img src='3-Results.png' width='100%'/><br><br>"+
"4. Start a new analysis by making another selection from the drop-down menus.<br><br>"+
"<img src='4-NewAnalysis.png' width='100%'/><br><br>"+
"5. The help page tells you a little bit more about each variable."+
"<img src='5-PointAbout.png' width='100%'/><br><br>"+
"<br><span id='deleteclouddata' class='link'><b>Delete from cloud</b></span> - will remove the analytics of your emails from the database.  For more information, view the Verbalucce <span id='privacy' class='link'><b>Privacy Policy</b></span>.<br><br><br>"+
"<hr>"+
"<b>About Verbalucce (realtime visualization)</b><br><br>"+
"Verbalucce rates the congruency between your current message and the message to which you are responding.<br><br>"+
"The closer your score is to 1, the more you are matching your communication style to your correspondent.  The more words that you and your correspondent typed, the greater confidence you can have in the score since it is based on more information.<br><br>"+
"<br><img src='realtime_screenshot.jpg' width='100%'/><br><br>"+
"<br><b>What Influences the Verbalucce Score?</b><br><br>"+
"<i>Word Count Comparison</i><br>"+
"How much are you matching the length of the other person's email; i.e. the number of words?<br><br>"+
"<i>Mood Matching</i><br>"+
"How much are you matching the other person's expression of positive or negative emotions, and low or high energy?<br><br>"+
"<i>Language Style Similarity</i><br>"+
"How much are you matching the other person's style of writing?  This score becomes available when the other person has typed at least 50 words and you have typed at least 50 words in your response.<br><br>"+
"<i>Words per Sentence</i><br>"+
"How much are you matching the other person's average sentence length?<br><br>"+
"<i>Word Length</i><br>"+
"How much are you matching the other person's use of big or small words?<br><br>"+
"<i>All-Caps</i><br>"+
"How much are you matching the other person's use of ALL-CAPS words?<br><br>"+
"<i>Emoticons</i><br>"+
"How much are you matching the other person's use of emoticons?<br><br><br>"+
"We ask you to describe email exchanges by selecting adjectives such as warm, cold, positive, and/or negative.  We will use your ratings, along with the stored analytics, to further refine and develop Verbalucce.</span>";

var requestFromBackendCount = 0;
var requestFromBackendFinished = 0;

function alignBelow(anchorDiv,moveableDiv){ //this is to align the dropdown menus below their proper red module
	moveableDiv.children().each(function(){
		$(this).show();
	});
	moveableDiv.css("left",anchorDiv.position().left); //align left sides
	moveableDiv.css("top",anchorDiv.position().top+anchorDiv.outerHeight()+parseInt(anchorDiv.css("margin-top"))); //align top of moveable to bottom of anchor
	moveableDiv.width(anchorDiv.outerWidth()); //set moveable width to anchor width
}

/*MAIN CONSTRCUTOR FUNCTION*************************/
function constructModules(){ //create the module objects (class) and build the dropdown menu for each
	$("#sentence").children("div").each(function(){
		modules.push(new Module($(this).attr("id"))); //push a module object to the modules array
		var index = modules.length - 1; //basically a counter
		modules[index].setOptions(options[modules[index].returnId()]); //set the module options, this happens FIRST BEFORE building the dropdown
		modules[index].setMaxSelectedOptions(maxSelectedOptions[index]); //set the maximum selected options for this module
		
		assignDefaultText(modules[index]); //set the default text to the module DOM objects
		constructDropdownMenu(modules[index]); //build the dropdown menu for THIS module

		attachModuleClick($(this));
	});

	$(".listOption").each(function(i){
		var selectorString = '[id="'+$(this).attr("id")+'"].' + $(this).attr("class").split(" ")[0];
		attachListOptionHighlighting(selectorString); //add mouseover functionality for each listOption
		attachListOptionClick(selectorString); //add click functionality for each listOption
	});

	//loop through modules and see if we should introduce a default option
	$("#sentence").children("div").each(function(){
		var id = $(this).attr("id");
		if(defaultOptions[id] != null){
			$($("#"+id+"Dropdown").children()[defaultOptions[id]]).click();
			$("#"+id+"Dropdown").toggle();
		}
	});
}
/*************************MAIN CONSTRCUTOR FUNCTION*/

function constructDropdownMenu(module){ //insert the dropdown menus into the DOM for each module
	var dropdownId = module.returnId() + "Dropdown";
	$('#sentence').after("<div id="+dropdownId+" class='dropdown'></div>"); //add the new dropdownDiv to the DOM

	var dropdownDiv = $("#"+dropdownId);
	var dropdownOptions = module.returnOptions(); //temporarily store the current module's dropdown options
	for(var i in dropdownOptions){
		var option = "<span id='"+dropdownOptions[i].id+"' class='"+module.returnId()+" listOption index"+ i + "'>"+dropdownOptions[i].display+"</span>";
		dropdownDiv.append(option); //insert an option into the selected dropdown menu
	}
}

function assignDefaultText(module){ //set default text for a module DOM from a module object
	$("#"+module.returnId()+"Default").text(module.returnDefaultText());
}

function returnModuleById(id){ //get a module object by a given id string
	for(var i in modules){
		if(modules[i].returnId() == id){
			return modules[i];
		}
	}
}

function returnModuleClass(selector){
	var moduleClass = "";
	$('.module').each(function(){
		if(selector.hasClass($(this).attr("id"))){
			moduleClass = $(this).attr("id"); //since listOptions have a class equal to their associated module ID, the grab the ID to keep pass to the click function
			debug.debug("module class inside the each loop = " + moduleClass);
			return false; //this is to break out of the loop, not out of the function
		}
	});
	debug.debug("we have reached the end");
	return moduleClass; //return the proper module ID (class for listOption) so we can detach/append the option out of the dropdown and into the module
}

function displayToast(toastMessage,delayNum){
	var toastDiv = $("#toast");
	toastDiv.html(toastMessage);
	toastDiv.stop().fadeIn();
	if(delayNum == 0){
		//do nothing
	}
	else{
		toastDiv.stop().fadeIn().delay(delayNum).fadeOut(); //eventually this DELAY will be determined by wait time of the current function
	}
}

/****mouse event handlers****************************/
function attachListOptionHighlighting(selectorString){ //dropdown listOption highlighting mouse listener
	$(selectorString).mouseenter(function(){
		$(this).css("background-color","#404040");
	}).mouseleave(function(){
		
		$(this).css("background-color","#EF4036");
	});
}

var peopleChanged = false;

function attachListOptionClick(selectorString){ //add a click listener that will remove a listOption from a dropdown and add it to the module as an option
	var currListOption = $(selectorString);
	currListOption.click(function(e){
		//if(.returnMaxSelectedOptions)
		e.stopPropagation();
		var moduleClass = returnModuleClass($(this)); //I think I don't need to do this, do .parent instead? <---- THIS WON'T WORK BECAUSE DROPDOWN DOESN'T HAVE A MODULE PARENT
		debug.debug("module class = " + moduleClass);

		var currModule = returnModuleById(moduleClass);
		currListOption.detach().appendTo($('#'+moduleClass));
		$(this).removeClass("listOption");
		$(this).addClass("option");
		$(this).removeAttr("style");
		$(this).unbind();

		currModule.addToSelectedOptions($(this).attr("id")); //add selected options to the module object

		/*************************************************************************************************************/
		//THIS NEEDS TO BE REWORKED AND REMOVED!
		if(moduleClass == "people"){ //if we are adding an option to the PEOPLE module
			//kick off a worker to populate the database for this person
			var emailString = $(this).attr('id');
		    IsContactInDBOrRunVerbalucce3(emailString); //check if we have it in the db, if true then do nothing, if false then RunVerbalucce3 on success

			//use the .length to control how many bars to display
			num = $(".people.option").length;

			peopleChanged = true;
		}

		if(moduleClass == "data"){
			//add new data type to the list of data to display PROCESSING LEGACY
			selectedData = returnModuleById("data").returnSelectedOptions()[0]; //since we are limiting DATA to 1 option right now
		}

		if(moduleClass == "time"){
			if(currModule.returnOptionValueById($(this).attr("id")) == -1){
				endTime = null;
				startTime = null;
				//numOfData = 1;
			}
			else{
				endTime = new Date();
				startTime = new Date();
				var timeValue = currModule.returnOptionValueById($(this).attr("id"));
				startTime.setMonth(startTime.getMonth() - timeValue);
				//numOfData = timeValue; //find out how many months we are trying to show.  This will not run if it is -1 and -1
			}
		}

		if(moduleClass == "view"){
			if(currModule.returnOptionValueById($(this).attr("id")) == 0){ //if aggregations
				numOfData = 1;
			}
			else{ //if month-by-month
				var timeValue = returnModuleById("time").returnOptionValueById(returnModuleById("time").returnSelectedOptions()[0]);
				numOfData = timeValue; //find out how many months we are trying to show.  This will not run if it is -1 and -1
			}
		}


		////////////////////////////////////////
		/*************************************************************************************************************/

		$("#"+moduleClass+"Default").text("");
		$("#"+moduleClass+"Dropdown").toggle();
		attachOptionClick($(this)); //since this is called if a user add a listOption, then we know we are adding an option to a module, therefore we need to attach a click to that option
		attachOptionHighlighting($(this));

		requestDataIfAllFilled(); //since this is called here only if a user adds a listOption as a module option, check to see if all modules are filled to send a query

		update();
	});
}

function attachModuleClick(selector){
	var currModule = selector;
	currModule.click(function(e){
		e.stopPropagation();
		var currModuleObject = returnModuleById(currModule.attr("id"));
		debug.debug(currModuleObject);
		if(currModuleObject.returnSelectedOptions().length < currModuleObject.returnMaxSelectedOptions()){
			$(".dropdown").hide(); //hide all dropdowns when a module is clicked
			$("#"+currModule.attr("id")+"Dropdown").toggle(); //then show the clicked module's dropdown menu
			alignBelow(currModule,$("#"+currModule.attr("id")+"Dropdown")); //now align the dropdown menu with the module DIV so it sits below it
		}
		else{
			debug.debug("you need to remove a selected option before adding a new one");
			$(".dropdown").hide();

			displayToast("Please remove a selected option before adding a new one.",2500);
		}

		//attach a keyup function when a module is clicked - assuming if you click you MUST be hovered
		var myDropdown = $("#"+$(this).attr("id")+"Dropdown");
		if(myDropdown.is(":visible")) {
			$(document).unbind("keyup").keyup(function( e ) {
				if(e.keyCode == 8 || e.keyCode == 46){
					//backspace
					myDropdown.children().each(function(){
						$(this).show();
					});
				}
				else{
					var keyString = String.fromCharCode(e.keyCode);
					myDropdown.children().each(function(){
						if($(this).text()[0].toLowerCase() != keyString.toLowerCase()){ 
							$(this).hide() 
						}
						else{
							$(this).show();
						}
					});
				}
			});
		}

		$(this).add(myDropdown).hover(function(){
			if(myDropdown.is(":visible")) {
				$(document).unbind("keyup").keyup(function( e ) {
					if(e.keyCode == 8 || e.keyCode == 46){
						//backspace
						myDropdown.children().each(function(){
							$(this).show();
						});
					}
					else{
						var keyString = String.fromCharCode(e.keyCode);
						myDropdown.children().each(function(){
							if($(this).text()[0].toLowerCase() != keyString.toLowerCase()){ 
								$(this).hide() 
							}
							else{
								$(this).show();
							}
						});
					}
				});
			}
		}, function(){
			$(document).unbind("keyup");
		});
	});
}

function returnOptionIndex(selector){
	var classList = selector.attr('class');
	var classes = classList.split(" ");
	for(var i=0;i<classes.length;i++){ 
		if(classes[i].search("index") == 0){ 
			return parseInt(classes[i].split("index")[1]);
		}
	}
}

function attachOptionClick(selector){
	var currOption = selector;
	var currOptionParent = currOption.parent();
	var optionIndex = returnOptionIndex(currOption);
	debug.debug("attaching option click to...")
	debug.debug(currOption);
	debug.debug(" with parent....  ");
	debug.debug(currOptionParent);
	currOption.click(function(e){
		e.stopPropagation();
		currOption.detach();//.appendTo($("#"+currOptionParent.attr("id")+"Dropdown"));
		$("#"+currOptionParent.attr("id")+"Dropdown").insertAt(optionIndex,$(this));
		$(this).removeClass("option");
		$(this).addClass("listOption");
		$(this).removeAttr("style");
		$(this).unbind();

		var personIndex = returnModuleById(currOptionParent.attr("id")).removeFromSelectedOptions($(this).attr("id"));

		if(currOptionParent.attr("id") == "people"){
			//remove this person from the graph PROCESSING LEGACY

			//update the graph for number of bars
			num = $(".people.option").length;

			var newTempTheirData = [];
			var newTempMyData = [];
			//remove the person's data from the temp data array
			for(var i=0;i<tempTheirData.length;i++){ //their and my data are the same
				if(tempTheirData[i].personIndex != personIndex){
					//tempTheirData.splice(i,1);
					if(tempTheirData[i].personIndex > personIndex){
						tempTheirData[i].personIndex--;
					}
					newTempTheirData.push(tempTheirData[i]);
				}
				if(tempMyData[i].personIndex != personIndex){
					//tempMyData.splice(i,1);
					if(tempMyData[i].personIndex > personIndex){
						tempMyData[i].personIndex--;
					}
					newTempMyData.push(tempMyData[i]);
				}
			}
			tempTheirData = newTempTheirData;
			tempMyData = newTempMyData;
		}
		if(currOptionParent.attr("id") == "data"){
			//remove this data type from the graph PROCESSING LEGACY
			/*tempTheirData = [];
			tempMyData = [];*/
			/*if(tempTheirData.length > 0){
		        for(var i=0;i<tempTheirData.length;i++){
		            if(tempTheirData[i].length > 0){
		                for(var u=0;u<tempTheirData[i].length;u++){
		                    tempTheirData[i][u]['values'][selectedData] = 0;
		                }
		            }
		            else{
		            	tempTheirData[i]['values'][selectedData] = 0;
		            }
		        }
		    }
		    if(tempMyData.length > 0){
		        for(var i=0;i<tempMyData.length;i++){
		            if(tempMyData[i].length > 0){
		                for(var u=0;u<tempMyData[i].length;u++){
		                    tempMyData[i][u]['values'][selectedData] = 0;
		                }
		            }
		            else{
		            	tempMyData[i]['values'][selectedData] = 0;
		            }
		        }
		    }*/
		}
		if(currOptionParent.attr("id") == "time"){
			startTime = null;
			endTime = null;
			tempTheirData = [];
			tempMyData = [];
		}
		if(currOptionParent.attr("id") == "view"){
			tempTheirData = [];
			tempMyData = [];
		}

		$(".dropdown").hide();

		//check if we should display the default text in the module (aka, if no options are chosen)
		debug.debug("number of options in " + currOptionParent.attr("id") + "= " + currOptionParent.children().length);
		if(currOptionParent.children().length == 1){
			$("#"+currOptionParent.attr("id")+"Default").text(returnModuleById(currOptionParent.attr("id")).returnDefaultText());
		}

		attachListOptionHighlighting("[id='"+$(this).attr("id")+"']"); //since this function is called when a user clicks an option to REMOVE it, this will need to be given the proper mouse handlers
		attachListOptionClick('[id="'+$(this).attr("id")+'"].' + $(this).attr("class").split(" ")[0]); 

		update();
	});
}

function attachOptionHighlighting(selector){
	var currOption = selector;
	var thisId = currOption.attr("id");
	currOption.mouseenter(function(){
		//set the highlighted data type for the graph PROCESSING LEGACY
		if(selector.parent().attr("id") == "people"){
			$('#people').children().not("[id='"+thisId+"'], #peopleDefault").stop().fadeTo(250,0.2);

			//now handle the bar graph
			d3.selectAll(".layerMe").filter(function(d,i){ //all that ARE NOT parent
					debug.debug("testing LayerMe " + i + " for " + $.inArray(thisId,returnModuleById("people").returnSelectedOptions()));
	                return (i !== $.inArray(thisId,returnModuleById("people").returnSelectedOptions()));
	            }).selectAll("rect") 
	                .transition()
	                //.style("stroke-opacity",0.075)
	                .style("fill-opacity",0.075);

			d3.selectAll(".layerThem").filter(function(d,i){ //all that ARE NOT parent
					debug.debug("testing LayerThem " + i + " for " + $.inArray(thisId,returnModuleById("people").returnSelectedOptions()));
			        return (i !== $.inArray(thisId,returnModuleById("people").returnSelectedOptions()));
			    }).selectAll("rect") 
			        .transition()
			        //.style("stroke-opacity",0.075)
			        .style("fill-opacity",0.075);

			//handle the description tags
			var themColor = d3.select(d3.selectAll(".layerThem")[0][$.inArray(thisId,returnModuleById("people").returnSelectedOptions())]).style("fill");
            var meColor = d3.select(d3.selectAll(".layerMe")[0][$.inArray(thisId,returnModuleById("people").returnSelectedOptions())]).style("fill");
            d3.select("#themToMe").transition().style("background-color",themColor);
            d3.select("#meToThem").transition().style("background-color",meColor);
		}

	}).mouseleave(function(){
		//remove the highlighted data type for the graph PROCESSING LEGACY
		if(selector.parent().attr("id") == "people"){
			$('#people').children().not("[id='"+thisId+"'], #peopleDefault").stop().fadeTo(250,1);

			//now handle the bar graph
			d3.selectAll(".layer").selectAll("rect")
	                .transition()
	                //.style("stroke-opacity",0.85)
	                .style("fill-opacity",function(d){ return d.opacity; });

	        //handle the description tags
            d3.select("#themToMe").transition().style("background-color","#404040");
        	d3.select("#meToThem").transition().style("background-color","#b0b0b0");
        }
	});
}
/****************************mouse event handlers****/

function allModulesFilled(){
	var allFilled = true;
	$(".module").each(function(){
		var numChildren = $(this).children().length;
		if(numChildren <= 1){ //if any module is empty, then we are not ready to query data
			allFilled = false;
		}
	});

	return allFilled;
}

function requestDataIfAllFilled(){ //check to see if all modules have options selected, then we fire off a call to the database/runverbalucce
	if((allModulesFilled() && !graphShown) || (peopleChanged && allModulesFilled())){ //all are filled here
		//check if we should do all time, average, or month-month request
		peopleChanged = false;
		if($("#view .option").attr("id") == "month-groups"){
			if($("#time .option").attr("id") == "all-time"){
				displayToast("You cannot view <i>all time</i> data as <i>month groups</i>",2500);
				$("#view .option").click();
			}
			else{
				requestPartialDataFromBackend();
			}
		}
		else if($("#view .option").attr("id") == "aggregations"){
			requestAverageDataFromBackend();
		}
	}
}

function requestPartialDataFromBackend(){
	//clear the graph PROCESSING LEGACY

	tempTheirData = [];
	tempMyData = [];

	debug.debug("requesting data from the backend...");
	displayToast("Please wait, we are grabbing your requested data.",0);
	var count = 0;

	var tempDate = new Date(startTime);
	for(var i=0;i<numOfData;i++){
		debug.debug('dates: ');
		debug.debug(tempDate);
		debug.debug("to:");
		GetLanguageMarkers(
				Math.round(tempDate.getTime()/1000),
				Math.round(tempDate.setMonth(tempDate.getMonth()+1)/1000), //this isn't .getTime() because the setMonth function returns long unix already
				count);
		debug.debug(tempDate);
		//debug.debug("date month = " + i + " through " + (i+1));
		debug.debug("count in request = " + count);
		count++;
	}

	requestFromBackendFinished = count;
	requestFromBackendCount = 0;

	debug.debug("done calling requestPartialDataFromBackend");
}

function requestAverageDataFromBackend(){
	tempTheirData = [];
	tempMyData = [];

	debug.debug("requesting data from the backend...");
	displayToast("Please wait, we are grabbing your requested data.",0);

	if(startTime == null && endTime == null){
		debug.debug("getting data for all time")
		GetLanguageMarkers(-1,-1,0);
	}
	else{
		debug.debug("getting data for " + startTime + " to " + endTime);
		GetLanguageMarkers(Math.round(startTime.getTime()/1000),Math.round(endTime.getTime()/1000),0);
	}

	requestFromBackendFinished = 1;
	requestFromBackendCount = 0;
}

function useDataFromBackend(result,returnIndex){ //this is called from the ajax success, will be changed in the future to a "promise"
	debug.debug("just received data index " + returnIndex);
	debug.debug(result);
	debug.debug("from the backend, what do you want to do with it?");
	var selectedPeople = returnModuleById("people").returnSelectedOptions();
	selectedData = returnModuleById("data").returnSelectedOptions()[0]; //since we are limiting DATA to 1 option right now

	requestFromBackendCount++; //how many returns have we gotten so far?
	if(requestFromBackendCount >= requestFromBackendFinished){ //have we gotten the correct number of returns?
		//hide the toast
		$("#toast").fadeOut();
	}

	for(var i=0;i<selectedPeople.length;i++){ //go through the selected people
		var hasFromMatch = false;
		var hasToMatch = false;
		if(result != null){
			for(var u=0;u<result.length;u++){
				if(result[u]['from'] == selectedPeople[i]){ //THEM ---TO--> ME
					hasFromMatch = true;
					debug.debug(result[u]);
					//theirData[returnIndex][i] = result[u][selectedData];

					//since the data come back out of order, we need a method for constructing the data arrays in correct order (people and month)
					var newObject = new Object();
					newObject.monthIndex = returnIndex;
					newObject.personIndex = i;
					newObject.values = result[u];
					tempTheirData.push(newObject);
				}
				if(result[u]['to'] == selectedPeople[i]){ //ME ---TO--> THEM
					hasToMatch = true;
					debug.debug(result[u]);

					var newObject = new Object();
					newObject.monthIndex = returnIndex;
					newObject.personIndex = i;
					newObject.values = result[u];
					tempMyData.push(newObject);
				}
			}
			if(!hasFromMatch){ //selected person doesn't match for THEM ---TO--> ME
				var newObject = new Object();
				newObject.monthIndex = returnIndex;
				newObject.personIndex = i;
				newObject.values = 0;
				tempTheirData.push(newObject);
			}
			if(!hasToMatch){ //selected person doesn't match for ME ---TO--> THEM
				var newObject = new Object();
				newObject.monthIndex = returnIndex;
				newObject.personIndex = i;
				newObject.values = 0;
				tempMyData.push(newObject);
			}
		}
		else{
			//theirData[returnIndex][i] = 0;
			var newObject = new Object();
			newObject.monthIndex = returnIndex;
			newObject.personIndex = i;
			newObject.values = 0;
			tempTheirData.push(newObject); //push to THEIR data
			tempMyData.push(newObject); //push to MY data
		}
	}

	update();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////


//"about" controller
function showAboutPage(){
	/*$("#about").animate({
		left: "0px",
		bottom: "0px"
	},1000);*/
	$("#about").unbind();
	
	$("#about span").fadeOut(250,function(){
		$("#about").switchClass("aboutIcon","aboutPage",250,function(){
			$("#about").html(aboutPageHTML);
			if(!allModulesFilled()){
				$("div:not(#about,#toast,.dropdown,.graphDescription)").fadeTo(250,0.1).css("pointer-events","none");
				//$("div:not(#about,#toast)").css("pointer-events","");
			}
			else{
				$("div:not(#about,#toast,.dropdown)").fadeTo(250,0.1).css("pointer-events","none");
				$("svg").fadeTo(250,0.1);
			}

			$("#deleteclouddata").click(function(e){
				e.stopPropagation();
				DeleteCloudSqlData();
			});

			$("#privacy").click(function(e){
				e.stopPropagation();
				window.open("http://verbalucce.appspot.com/privacy-notice.html","_blank");
			})

			$("body").click(function(e){
				e.stopPropagation();
				showAboutIcon();
			});
		});
	});
}

function showAboutIcon(e){
	$("body").unbind();

	$("#about span").fadeOut(250,function(){
		$("#about").switchClass("aboutPage","aboutIcon",250,function(){
			$("#about").html("<span>?</span>");
			if(!allModulesFilled()){
				$("div:not(#about,#toast,.dropdown,.graphDescription)").fadeTo(250,1).css("pointer-events","");
				//$("svg").fadeTo(250,1);
			}
			else{
				$("div:not(#about,#toast,.dropdown)").fadeTo(250,1).css("pointer-events","");
				$("svg").fadeTo(250,1);
			}
		});
	});
	
	$("#about").click(function(e){
		e.stopPropagation();
		debug.debug("now showing about page");
		showAboutPage();
	});
	
}

$(document).ready(function(){ //when the document has loaded
	$(window).resize(resize);
	resize(); //this is called on viz.js to resize the visualization

	constructModules(); //construct the module objects and then construct the dropdown menu for each module... the DOM modules are made on the html until I can figure out a savvy way to add them dynamically
	
	//hide all dropdown menus when the website launches
	$(".dropdown").toggle();
	$("#toast").toggle();

	$('html').click(function(){
		$('.dropdown').hide();
	})

	$('body').click(function(){
	})

	/**attach a mouse listener to the graph description bars (to you) and (from you)****************/
	$("#themToMe").mouseenter(function(){
		d3.selectAll(".layerMe").transition().style("opacity",0.025);
		d3.select("#meToThem").transition().style("opacity",0.1);
	}).mouseleave(function(){
		d3.selectAll(".layerMe").transition().style("opacity",1);
		d3.select("#meToThem").transition().style("opacity",1);
	})
	$("#meToThem").mouseenter(function(){
		d3.selectAll(".layerThem").transition().style("opacity",0.025);
		d3.select("#themToMe").transition().style("opacity",0.1);
	}).mouseleave(function(){
		d3.selectAll(".layerThem").transition().style("opacity",1);
		d3.select("#themToMe").transition().style("opacity",1)
	});
	/****************attach a mouse listener to the graph description bars (to you) and (from you)**/

	//attach the click event for about page
	$("#about").click(function(e){
		e.stopPropagation();
		debug.debug("now showing about page");
		showAboutPage();
	});

});



