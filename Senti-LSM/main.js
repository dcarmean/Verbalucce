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
  
 File: main.js
*/
/*--------------------------------------------------------------------------*/
// (2013-06-20 jtseng2)
//              - Fixed emoticon
//              - Fixed trailing spaces in dictionary (fix is actually in loadDictionary.py)
//              - Added astDict for partial matching algorithm
//                  -->placeholder, partial matching is not yet fixed.
//              - Changed HUD style: 2 decimal stats, smaller font size
//              - Changed stats names: LSMScore->Language Style Conformance,
//                  WCDiscrepancy-> Word Count Diff, MoodMatchScore->Mood Match
//              - Changed moodmap quadrant names to symbolic representation.
// (2013-06-28 jtseng2)
//              - Changed Word Count Diff representation
//              - Changed Conformance to Similarity
//              - Changed Other People's Mood to Other's Mood
// (2013-07-01 jtseng2)
//              - Implemented partial match
//              - addressed some perf issue
//              - Replaced ^ and v with unicode arrows
//              - Matched greys of tables and gmail interface
// (2013-07-02 jtseng2)
//              - Fixed datetime format string with word count == 13 (people who use middle name.)
// (2013-07-11 jtseng2)
//              - Established Processing UI framework.
//              - word base analysis for performance improvement.
//              - Added overall Verbalucce score.
// (2013-07-31 alaskow)
//				- Reworked isMoodMatchExists into if($(#verbalucce_anime).length <= 0)
//				- Removed most of the table providing data - packaged this data into a dropdown window
//				- Fixed Processing/Canvas auto sizing and made it a more uniform aesthetic (color, size)
//				- Attempted adding a new DIV (absolute positioning) to the Body, unsuccessfully
//				- Reworked the construction of the table (now using " and ' rather than " and \")
//				- Added functionality for adding content to the bottom bar of the compose window
//					- This does not work always because Google changes the DIV id each time Gmail is loaded
// (2013-08-14 jtseng2)
//              - Removed the need of user clicking "Show trimmed content" for fetching the gmail history
//              - Staged code for running sentilsm against history once instead of all the time. (not done yet)
// (2013-08-26 jtseng2)
//              - Fix Verbalucce score starts at 0.7 due to wrong wordcount (we were counting blanks)
//              - Removed "Verbalucce". Add "Out of sync" and "In sync" on both side of the anime
//              - Modified Verbalucce_Prototype_1.pde on the server to show verbalucce score in the circle.
// (2013-09-01 jtseng2)
//              - Display all the stats for Verbalucce under verbalucce_anime
//              - Add debug library and set logging to info and above only.
//              - Added text smoothing in Verbalucce_Prototype_1.pde
// (2014-01-28 jtseng2)
//				- Replace all lsm functions with sentilsm3 module
// 				- Replace all console.log to debug.xxx
// (2014-01-30 jtseng2)
//				- Added communication between ContentScript and BackgroundPage 
/*--------------------------------------------------------------------------*/

// Debug Level: 0 - disable logging, 1 - error , 2 - warning, 3 - info, 4 - debug, 5 - log

debug.setLevel(2);  // Only display error, warning and info logging.

debug.info("main.js loaded");
if (jQuery) {
    debug.info("jQuery loaded");// jQuery loaded
} else {
    debug.info("jQuery not loaded");// jQuery not loaded
}

if (Processing) {
    debug.info("Processing loaded");
} else {
    debug.info("Processing not loaded");
}

// Create Senti-LSM instance

sentilsm=SentiLSM()


gmailHtml = $("html");
doc = document;

var singleRecipient = false;
var recipientsSentToDB = false;
var recipientAddress;

var myInfo = doc.createElement('div');
myInfo.id = "info_window";
myInfo.position = "absolute";
$("#info_window").hide();


var svg;
var circle
var xScale;

var accountInfo;
function requestAccountInfo()
{ 
	chrome.runtime.sendMessage({kind: "accountInfo"}, function(response) {
  	accountInfo = response;});
}

function loadDictionary(){
    var url = "https://verbalucce.appspot.com/jsonp5";
    
    var result;
    
    //Use GET method to send data to server
    jqxhr = $.ajax({
                   url: "https://verbalucce.appspot.com/jsonp5",
                   type: "GET",
                   async: false,
                   cache: false,
                   success: function(data){
                   }
                   });
    
    debug.debug(jqxhr.responseText);
    
    result = $.parseJSON(jqxhr.responseText);
    return result.dictionary;
}


D = loadDictionary();
sentilsm.loadDictionary(D);
sentilsm.initialize();

gmail_quote = "";

localStorage["ComposingMode"]=false

// Once the user move away from the composing window, reset the flag to false
function resetOnBlur() {
    localStorage["ComposingMode"]=false
}

function keyUp(e) {
    var keyVal = String.fromCharCode(e.which)
    var ae = document.activeElement
    var p  = ae.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
    var ShowTrimmedContentButton = p.querySelector('[data-tooltip = "Show trimmed content"]')
    
    if (ae.contentEditable=="true")
    {
        if (localStorage["ComposingMode"]=="false")
        {
            // One time event
            ae.onblur = resetOnBlur
            
            // save the gmail quoted history
            if (ShowTrimmedContentButton!=null)
            {
                ShowTrimmedContentButton.click()
                gmail_quote = ae.innerText
            }
            localStorage["ComposingMode"]=true
        }
        
        if ((e.which == 8)  ||      // backspace
            (e.which == 13) ||      // enter
            (e.which == 46) ||      // delete
            (keyVal == " ") ||
            (keyVal == ".") ||
            (keyVal == ",") ||
            (keyVal == "!") ||
            (keyVal == "?") ||
            (keyVal == "~"))         // carriage
        {
            Senti2(ae.innerText);
        }
    }
}; 

(function checkForNewIframe(doc, uniq) {
    try {
        if (!doc)
            return; // document does not exist. Cya
        // ^^^ For this reason, it is important to run the content script
        //    at "run_at": "document_end" in manifest.json

        // Unique variable to make sure that we're not binding multiple times
        if (!doc.rwEventsAdded9424550)
        {
            //doc.addEventListener('keydown', keyDown, true);
            doc.addEventListener('keydown', keyUp, true);
            doc.rwEventsAdded9424550 = uniq;	
        }
        else if (doc.rwEventsAdded9424550 !== uniq)
        {
            // Conflict: Another script of the same type is running
            // Do not make further calls.
            return;
        }

         var iframes = doc.getElementsByTagName('iframe'), contentDocument;

        for (var i=0; i<iframes.length; i++)
        {
            var src = iframes[i].src
            if (src.match(/https:\/\/mail.google.com/))
            {
                contentDocument = iframes[i].contentDocument;
                if (contentDocument && !contentDocument.rwEventsAdded9424550)
                {
                    // Add poller to the new iframe
                    checkForNewIframe(iframes[i].contentDocument);
                }
            }
        }
    }
    catch(e)
    {
        // Error: Possibly a frame from another domain?
        debug.error('[ERROR] checkForNewIframe: '+e);
    }
 
    setTimeout(checkForNewIframe, 250, doc, uniq); //<-- delay of 1/4 second
})(document, 1+Math.random()); // Initiate recursive function for the document.

function isMoodDisplayExist(table)
{
	if( $('#r0').length > 0){
		return true;
	}
	else{ return false; }
}

/*function changeverbalucce(table, id, quadrant, moodString)
{
    var rows = table.getElementsByTagName('tr');

    rows[id].cells[quadrant].firstChild.innerText=moodString;
}*/

function changeverbalucce(cellID, moodString){
    $("#"+cellID).text(moodString);
}

var Month = {
    'Jan' : 1,
    'Feb' : 2,
    'Mar' : 3,
    'Apr' : 4,
    'May' : 5,
    'Jun' : 6,
    'Jul' : 7,
    'Aug' : 8,
    'Sep' : 9,
    'Oct' : 10,
    'Nov' : 11,
    'Dec' : 12,
};

//.............................. Get Month
function getmonth(month)
{
    return Month[month];
}

function getDateTime(words)
{
    var dt = +new Date;
    var wcnt = words.length;
    var dtString = "1999-1-1 00:00:00";
    
    if ((wcnt == 12) || (wcnt == 13))
    {
        weekday = words[1];
        month   = getmonth(words[2]);
        day     = parseInt(words[3].replace(",",''));
        year    = parseInt(words[4]);
        time    = words[6];
        t = time.split(":");
        hh = parseInt(t[0]);
        mm = parseInt(t[1]);
        ampm = words[7].replace(",",'');
        if ((ampm == "PM") & (hh < 12))
        {
            hh += 12;
        }
    }
    else if (wcnt == 11)
    {
        month   = getmonth(words[1].replace(",",''));
        day     = parseInt(words[2].replace(",",''));
        year    = parseInt(words[3].replace(",",''));
        time    = words[5];
        t = time.split(":");
        hh = parseInt(t[0]);
        mm = parseInt(t[1]);
        ampm = words[6].replace(",",'');
        
        if ((ampm == "PM") & (hh < 12))
        {
            hh += 12;
        }
    }
    else if (wcnt == 10)
    {
        month   = getmonth(words[2].replace(",",''));
        day     = parseInt(words[1].replace(",",''));
        year    = parseInt(words[3]);
        time    = words[4];
        t = time.split(":");
        hh = parseInt(t[0]);
        mm = parseInt(t[1]);
        ampm = words[5].replace(",",'');
        
        if ((ampm == "PM") & (hh < 12))
        {
            hh += 12;
        }
    }
    else if (wcnt == 9)
    {
        month   = getmonth(words[2].replace(",",''));
        day     = parseInt(words[1].replace(",",''));
        year    = parseInt(words[3]);
        time    = words[4];
        t = time.split(":");
        hh = parseInt(t[0]);
        mm = parseInt(t[1]);
        ampm = words[5].replace(",",'');
        if ((ampm == "PM") & (hh < 12))
        {
            hh += 12;
        }        
    }
    else
    {
        debug.error("Unexpected datetime format, word count = " + wcnt);
        debug.error("Datetime string:", words);
    }
    
    
    // Construct UTC timestamp
    dtString = year + "-" + month + "-" + day + " " + hh + ":" + mm + ":00"
    dt = Date.parse(dtString);
    
    return dt
}

//..............................isQuotedLine....................................
// Determine if the line is the start of quoted history
//..............................................................................
function isQuotedLine(line)
{
    var isQuoted = false
    var words = line.split(" ")
    var wcnt=words.length

    // On <date>, <author> wrote:
    if ((words[0]=="On" && words[wcnt-1]=="wrote:") ||
        (line.search("^From:")==0))
    {
        isQuoted = true
    }
    
    return  isQuoted
}

function ParseEmailContent(emailcontext){
    debug.debug(emailcontext);
    
    //-- Move to global var later --//
    emailers = [];
    responselatency = 0;
    responsecount = 1;
    emails = {
        'ResponseLatency'   : responselatency,
        'ResponseCount'     : responsecount,
    }
    gmail = {
        'Emailers'  : emailers,
    };
    
    //------------------------------//
    
    var address = "myself";
    var content = [];
    var datetime = +new Date;
    var olddatetime;
    var oldaddress;
    var latency;
    var wordcount = 0;
    var words;
    
    emailerscount = 0;
    
    gmail[address]={};
    gmail[address]['ResponseCount']=0;
    gmail[address]['ResponseLatency']=0;
    gmail[address]['Mails']=[];
    gmail['Emailers'].push(address);
    debug.debug(gmail['Emailers']);
    emailerscount = 1;
    
    var lines = emailcontext.replace(/\r\n/g, "\n").split("\n");
    for (var i = 0; i < lines.length; i++)
    {
        debug.debug(lines[i]);
        words = lines[i].split(" ");
        wcnt = words.length
        
        if (wcnt>0 && words[0].length!=0)
        {           
            olddatetime = datetime;
            oldaddress  = address;
            
            if (isQuotedLine(lines[i]))
            {
                debug.debug("Current Emailer:"+oldaddress);
                debug.debug("Current Time:"+datetime);
                
                // Store previous email information
                email = {};
                email['datetime']   = datetime;
                email['content']    = content;
                email['wordcount']  = sentilsm.getWordCount(content);
                gmail[oldaddress]['ResponseCount'] +=1;
                gmail[oldaddress]['Mails'].push(email);
                
                
                // Extract timestamp and author
                address = words[wcnt-2];
                
                datetime = getDateTime(words);
                
                // Reset mail/content for next emailer
                content = [];
                wordcount = 0;
                
                if (gmail.hasOwnProperty(address))
                {
                    mail = gmail[address]['Mails'];
                }
                else
                {
                    gmail[address]={};
                    gmail[address]['Mails']=[];
                    gmail[address]['ResponseCount']=0;
                    gmail[address]['ResponseLatency']=0;
                    gmail['Emailers'].push(address);
                    emailerscount += 1;
                }
                
                
                // Calculate average response latency for each emailer
                
                latency = Math.abs(olddatetime - datetime);
                    
                gmail[oldaddress]['ResponseLatency'] = (gmail[oldaddress]['ResponseLatency'] * (gmail[oldaddress]['ResponseCount'] - 1) + latency)/gmail[oldaddress]['ResponseCount'];
                
                    
            }
            else
            {
                content.push(lines[i]);
            }
        }
    }
    
    
    //    oldest email
    email={};
    email['datetime']    = datetime;
    email['content']     = content;
    email['wordcount']   = sentilsm.getWordCount(content);
    gmail[address]['Mails'].push(email);

    debug.debug(gmail);
    debug.debug(gmail['Emailers'].length);
    debug.debug(gmail['Emailers'][1]);
    
    return gmail;
}


var posWords = new Array();
var negWords = new Array();
var emailDataForDB = {};
var storedVerbalucceScore;

//THE FUNCTION THAT CALLS EVERYTHING ELSE AND UPDATES OUR DISPLAY//
function Senti2(emailcontext)
{
    // Sentiment and LSM analysis
    var emailer1, emailer2, email1, email2, emails;
    var gmail = ParseEmailContent(emailcontext);
	var verbalucceResult = {};

    if (gmail['Emailers'].length > 0)
    {
        emailer1    = gmail['Emailers'][0];
        emails      = gmail[emailer1]['Mails'];
        email1      = emails[0]['content'];
        
        emailer2    = gmail['Emailers'][1];
        emails      = gmail[emailer2]['Mails'];
        email2      = emails[0]['content'];
		    
        verbalucceResult = sentilsm.RunVerbalucce(email1, email2);
        storedVerbalucceScore = verbalucceResult.verbalucce_score;
    }
	
    var result, content;
    var ae = doc.activeElement;
    var testRow;
    var moodmap,moodString;
    var currentRow = ae.parentNode.parentNode.parentNode.parentNode;
    var currentTable = currentRow.parentNode;
    var rootTable = currentTable.parentElement;
    var p  = ae.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
    var tb = ae.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
    var tb1 = tb.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement
    
    var moodDisplay=isMoodDisplayExist(currentTable);
	debug.debug("moodDisplay = " + moodDisplay);
    
    rootTable.style.borderCollapse = "collapse";

    currentTable.setAttribute("id", "current_Table_Verbalucce");
    currentTable.setAttribute("height","5px");
	
	ae.parentElement.parentElement.parentElement.colSpan = 5;
	
	currentTable.onmouseup = function(){
		//setBottomBar(); //DON'T DO THIS JUST YET
	};
    
    //if(!moodDisplay.exist)
    //{
	if($("#verbalucce_anime").length <= 0){
		debug.debug("creating the table");
        moodString =
        "<tr id='r0' bgcolor='#F2F2F2' style='text-align:center;height:25px;border-collapse:collapse' contentEditable=false border='0'>" +
        "<td id='verbaluccescore'><font size='3'>Out of sync</font></td>" +
        "<td id ='verbalucce_anime' colspan='2' width='45%' height='0px' style='padding-left:10px;'></td>" +
        "<td id='verbaluccescore'><font size='3'>In sync</font></td>" +
        "<td id='subjectiveDropdown' width='22%' style='padding:10px;font-size:14px;text-align:left;'>"+
                "<span style='color:#EF4036'><b>Describe this interaction</b></style><br>" +
                "<select id='s4' class='s4' multiple='multiple' style='width:100%;'>" +
                "<option>Warm</option>"+
                "<option>Cold</option>"+
                "<option>Positive</option>"+
                "<option>Negative</option>"+
            "</select>"+
        "</td>" +
        "</tr>" +
        "<tr id='r1' bgcolor='#404040' style='text-align:center;height:10px;color:#fff;font-size:10px' contentEditable=false>" +
        "<td id='poswordcount'>Positive Word Count</td>" +
        "<td id='negwordcount'>Negative Word Count</td>" +
        "<td id='wcd'>Word Count Comparison</td>" +
        "<td id='moodmatchscore'>Mood Match</td>" +
        "<td id='lsm'>Language Style Similarity </td>" +
        "</tr>";
        /*"<tr bgcolor='#404040'>" +
        "<td colspan='5' style='font-size:8px'><br></td>"+
        "</tr>"+
        "<tr id='r2' bgcolor='#404040' style='text-align:right;height:10px;color:#fff;font-size:14px' contentEditable=false>" +
        "<td id='linkToHistorical' colspan='5'><span style='color:#EF4036;cursor:pointer;margin:8px'><b>Want to see your trends?</b></span></td>"+
        "</tr>";*/
		testRow=$(moodString);
		testRow.insertBefore(currentRow);

        /*$("#linkToHistorical").click(function(){
            window.open(chrome.extension.getURL('interface2.html'),'_blank');
        });*/

        $(".s4").dropdownchecklist( { emptyText: "<i>Select all that apply</i>", 
                                        maxDropHeight: 100, 
                                        width: $("#subjectiveDropdown").width(),
                                        onComplete: function(selector) {
                                            subjectiveValues = {};
                                            for( i=0; i < selector.options.length; i++ ) {
                                                var val = selector.options[i].selected ? 1 : 0;
                                                subjectiveValues[selector.options[i].value.toLowerCase()] = val;
                                            }
                                            //debug.debug(subjectiveValues);
                                        }
                                    } );

        subjectiveValues = {};
        $(".s4 option").each(function(){ subjectiveValues[$(this).text().toLowerCase()] = 0; });

        var leftRange = $("#verbalucce_anime").offset().left;
        var rightRange = leftRange + $("#verbalucce_anime").width();

        xScale = d3.scale.linear()
            //.domain([0,d3.max(mergedData)])
            .domain([0,1])
            .range([0, d3.select("#verbalucce_anime").style("width")]);

        svg = d3.select("#verbalucce_anime")
            .append("svg")
            .attr("class","score");

        debug.debug("anime height: "+d3.select("#verbalucce_anime").style("height"));
        debug.debug("anime width: "+d3.select("#verbalucce_anime").style("width"));
            
        svg.style("background-color","#F2F2F2")
            .attr("width",d3.select("#verbalucce_anime").style("width"))
            .attr("height",(parseInt(d3.select("#verbalucce_anime").style("height").replace("px"))/1.5)+"px");

        /*$("svg").click(function(){
            debug.debug("anime height: "+d3.select("#verbalucce_anime").style("height"));
            debug.debug("anime width: "+d3.select("#verbalucce_anime").style("width"));
            debug.debug("svg height: "+d3.select("svg").style("height"));
            debug.debug("svg width: "+d3.select("svg").style("width"));

            svg.attr("width",d3.select("#verbalucce_anime").style("width"))
                .attr("height",(parseInt(d3.select("#verbalucce_anime").style("height").replace("px"))/2)+"px");
        })*/

        var line = svg.append("path");
        line.attr("d","M 0 " + (parseInt(d3.select("svg").style("height").replace("px"))/2) + " L " + (d3.select("svg").style("width").replace("px","")) + " " + (parseInt(d3.select("svg").style("height").replace("px"))/2) + " z")
            .style("stroke-width",1)
            .style("stroke","#000");

        circle = svg.append("circle");
        circle.attr("cx",xScale(verbalucceResult.verbalucce_score))
            .attr("cx",xScale(verbalucceResult.verbalucce_score))
            .attr("cy",(parseInt(d3.select("svg").style("height").replace("px"))/2)+"px")
            .attr("r",(parseInt(d3.select("svg").style("height").replace("px"))/2)+"px")
            .style("fill","#EF4036");

        var t = svg.append("text");
        t
            .style("fill","#fff")
            .attr("x",xScale(verbalucceResult.verbalucce_score))
            .style("text-anchor","middle")
            .attr("y",(parseInt(d3.select("svg").style("height").replace("px"))/2 + 5)+"px" )
            .attr("font-size","12px")
            .text(verbalucceResult.verbalucce_score);
		
		debug.debug("does expand_data exist? " + ($("#expand_data").length > 0));
		
		var sendButton = $('[data-tooltip^="Send"]');
		debug.debug("adding sendButton as: " + sendButton.attr('id'));

        
		
		sendButton.mousedown(function(email1){
            requestAccountInfo();

            $(this).unbind();

            setTimeout(function(){
    			debug.debug("I clicked SEND!");
                emailDataForDB['FromEmailAddress'] = accountInfo['email'];
                emailDataForDB['ToEmailAddress'] = emailer2.replace(">","").replace("<","");
                emailDataForDB['ThreadID'] = window.location.href.split("/").pop();
                emailDataForDB['SubjectiveValues'] = subjectiveValues;
                emailDataForDB['VerbalucceResult'] = verbalucceResult;
                emailDataForDB['SentAt'] = Math.round(new Date().getTime()/1000);
                debug.debug(emailDataForDB);

                $.ajax({
                    url: "https://verbalucce.appspot.com/cloudsqlwritesubjectivefeedbackandverbalucceresult",
                    type: "POST",
                    async:true,
                    cache: false,
                    data: {
                            account:JSON.stringify(accountInfo),
                            verbalucceData:JSON.stringify(emailDataForDB),
                            },
                    dataType:"json",
                    success: function(data){
                        debug.debug("success");
                    },
                    error: function (xhr, ajaxOptions, thrownError) {
                        debug.error(xhr.status);
                        debug.error(thrownError);
                    }
                });
            },2500);
		});
    }
    else
    {

        moodString = "Language Style Similarity: " + verbalucceResult.lsmscore;
        //changeverbalucce(currentTable, "r1", "lsm", moodString);
        changeverbalucce("lsm",moodString);
        moodString = "Word Count Comparison: " + verbalucceResult.wc1 + "/" + verbalucceResult.wc2;
        //changeverbalucce(currentTable, "r1", "wcd", moodString);
        changeverbalucce("wcd",moodString);
        moodString = "Mood Match: " + verbalucceResult.moodmatch_score;
        //changeverbalucce(currentTable, "r1", "moodmatchscore", moodString);
        changeverbalucce("moodmatchscore",moodString);
        moodString = "Positive Word Count: " + (verbalucceResult.moodmap1.highpos + verbalucceResult.moodmap1.lowpos) + "/" + (verbalucceResult.moodmap2.highpos + verbalucceResult.moodmap2.lowpos);
        //changeverbalucce(currentTable, "r1", "poswordcount", moodString);
        changeverbalucce("poswordcount",moodString);
        moodString = "Negative Word Count: " + (verbalucceResult.moodmap1.highneg + verbalucceResult.moodmap1.lowneg) + "/" + (verbalucceResult.moodmap2.highneg + verbalucceResult.moodmap2.lowneg);
        //changeverbalucce(currentTable, "r1", "negwordcount", moodString);
        changeverbalucce("negwordcount",moodString);

        //$("#verbalucce_anime").height($("#current_Table_Verbalucce").height());

        if(verbalucceResult.wc1 > 50 && verbalucceResult.wc2 > 50){
            d3.select("#lsm").transition().style("opacity",1);
        }
        else{
            d3.select("#lsm").transition().style("opacity",0.3);
        }

        $(".s4").width($("#subjectiveDropdown").width());

        var leftRange = $("#verbalucce_anime").offset().left;
        var rightRange = leftRange + $("#verbalucce_anime").width();
        xScale = d3.scale.linear()
            //.domain([0,d3.max(mergedData)])
            .domain([0,1])
            .range([0, d3.select("#verbalucce_anime").style("width")]);

        svg
            .attr("width",d3.select("#verbalucce_anime").style("width"))
            .attr("height",(parseInt(d3.select("#verbalucce_anime").style("height").replace("px"))/1.5)+"px");


        debug.debug("anime height: "+d3.select("#verbalucce_anime").style("height"));
        debug.debug("anime width: "+d3.select("#verbalucce_anime").style("width"));

        var line = svg.select("path");
        line.attr("d","M 0 " + (parseInt(d3.select("svg").style("height").replace("px"))/2) + " L " + (d3.select("svg").style("width").replace("px","")) + " " + (parseInt(d3.select("svg").style("height").replace("px"))/2) + " z")
            .style("stroke-width",1)
            .style("stroke","#000");

        circle = svg.select("circle");
        circle
            .transition()
            .duration(1500)
            .ease("elastic")
            .attr("cx",xScale(verbalucceResult.verbalucce_score))
            .attr("cy",(parseInt(d3.select("svg").style("height").replace("px"))/2)+"px")
            .attr("r",(parseInt(d3.select("svg").style("height").replace("px"))/2)+"px");

        var t = d3.select("text");
        t
            .transition()
            .duration(1500)
            .ease("elastic")
            .attr("x",xScale(verbalucceResult.verbalucce_score))
            .style("text-anchor","middle")
            .attr("y",(parseInt(d3.select("svg").style("height").replace("px"))/2 + 5)+"px" )
            .text(verbalucceResult.verbalucce_score);
    }

	
	//the following is trying to grab the bottom bar
	//$("table").each(function(index){
		//verbalucceResult.verbalucce_score("the ID of tbody # " + index + " = " + $(this).attr("id"));
	//});
	
    //	replaceBodyHTML();
	
	//ae.parentElement.parentElement.parentElement.colSpan = 5;
	//debug.debug("Column Span = " + ae.parentElement.parentElement.parentElement.colSpan);
	
}


/*String.prototype.replaceAll = function(str1, str2, ignore) 
{
	return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
}*/

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

var gmailBody;

function replaceBodyHTML(){
	/*GET ACCESS TO THE DIV CONTAINING THE MESSAGE YOU ARE WRITING*/
	//var parentOfGmailExtra = $(".gmail_extra").parent().parent().attr("id");
	//var parentOfGmailExtra = document.activeElement.parentNode.parentNode.parentNode.parentNode.parentNode.getAttribute("id");
	var parentOfGmailExtra = document.activeElement.getAttribute("id");
	var parentElement = document.getElementById(parentOfGmailExtra);
	gmailBody = parentElement;
	var savedSel = saveSelection(parentElement); //this is for the HTML swapping for highlighting words
	debug.debug("parent of gmail extra is " + parentOfGmailExtra);
	var wholeHTML = parentElement.innerHTML; //the whole compose window
	////verbalucceResult.verbalucce_score("WHOLE HTML = " + wholeHTML);
	var currentMsgHTML = wholeHTML.split('<div class="gmail_extra">')[0]; //just the html of what the user is currently writing
	var restOfMsgHTML = '<div class="gmail_extra">' + splitWithTail(wholeHTML,'<div class="gmail_extra">',1)[1];
	////verbalucceResult.verbalucce_score("REST OF MSG HTML = " + restOfMsgHTML);
	//var currentMsgStrippedText = $('<p>'+currentMsgHTML+'</p>').text(); //just the TEXT of the current message
	//verbalucceResult.verbalucce_score("processed text of parentOfGmailExtra = " + currentMsgStrippedText);
	/**************************************************************/
	
	//Test body against pos and neg words arrays//
	debug.debug(posWords);
	debug.debug(negWords);
	////verbalucceResult.verbalucce_score("MY CURRENT MESSAGE = " + currentMsgHTML);
	parentElement.innerHTML = parentElement.innerHTML.replace(/<font[^>]*>/g, '').replace(/<\/font>/g, ''); //strip out html
	for(var i=0;i<posWords.length;i++){
		//THIS ONE WORKED//parentElement.innerHTML = replaceAll(posWords[i],"<font color='#00ff00'>" + posWords[i] + "</font>", parentElement.innerHTML);
		var re = new RegExp("("+posWords[i]+")",'ig');
		parentElement.innerHTML = parentElement.innerHTML.replace(re,"<font color='#00cc00'>$1</font>");
	}
	for(var i=0;i<negWords.length;i++){
		//THIS ONE WORKED//parentElement.innerHTML = replaceAll(negWords[i],"<font color='#ff0000'>" + negWords[i] + "</font>", parentElement.innerHTML);
		var re = new RegExp("("+negWords[i]+")",'ig');
		parentElement.innerHTML = parentElement.innerHTML.replace(re,"<font color='#cc0000'>$1</font>");
	}
	////verbalucceResult.verbalucce_score("NEW CURRENT MESSAGE = " + currentMsgHTML);
	////parentElement.innerHTML = currentMsgHTML + restOfMsgHTML;
	
	restoreSelection(parentElement,savedSel);
	///////////////////////////////////////
}

function removeColorInBody(){
	//var parentOfGmailExtra = document.activeElement.getAttribute("id");
	//var parentElement = document.getElementById(parentOfGmailExtra);
	//var gmailBody = document.getElementById('current_Table_Verbalucce');
	var savedSel = saveSelection(gmailBody); //this is for the HTML swapping for highlighting words
	////verbalucceResult.verbalucce_score("gmailBody used to be: " + gmailBody.innerHTML);
	gmailBody.innerHTML = gmailBody.innerHTML.replace(/<font[^>]*>/g, '').replace(/<\/font>/g, ''); //strip out html
	////verbalucceResult.verbalucce_score("gmailBody is now: " + gmailBody.innerHTML);
	
	restoreSelection(gmailBody,savedSel);
	
}

function splitWithTail(str,delim,count){
  var parts = str.split(delim);
  var tail = parts.slice(count).join(delim);
  var result = parts.slice(0,count);
  result.push(tail);
  return result;
}

function unloadVerbalucce(){
	removeColorInBody();
	posWords = new Array();
	negWords = new Array();
}

/*THIS IS FOR THE MESSAGE BODY REPLACING FUNCTION*/
function saveSelection(containerEl) {
    var charIndex = 0, start = 0, end = 0, foundStart = false, stop = {};
    var sel = rangy.getSelection(), range;

    function traverseTextNodes(node, range) {
        if (node.nodeType == 3) {
            if (!foundStart && node == range.startContainer) {
                start = charIndex + range.startOffset;
                foundStart = true;
            }
            if (foundStart && node == range.endContainer) {
                end = charIndex + range.endOffset;
                throw stop;
            }
            charIndex += node.length;
        } else {
            for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                traverseTextNodes(node.childNodes[i], range);
            }
        }
    }
    
    if (sel.rangeCount) {
        try {
            traverseTextNodes(containerEl, sel.getRangeAt(0));
        } catch (ex) {
            if (ex != stop) {
                throw ex;
            }
        }
    }

    return {
        start: start,
        end: end
    };
}

function restoreSelection(containerEl, savedSel) {
    var charIndex = 0, range = rangy.createRange(), foundStart = false, stop = {};
    range.collapseToPoint(containerEl, 0);
    
    function traverseTextNodes(node) {
        if (node.nodeType == 3) {
            var nextCharIndex = charIndex + node.length;
            if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                range.setStart(node, savedSel.start - charIndex);
                foundStart = true;
            }
            if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                range.setEnd(node, savedSel.end - charIndex);
                throw stop;
            }
            charIndex = nextCharIndex;
        } else {
            for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                traverseTextNodes(node.childNodes[i]);
            }
        }
    }
    
    try {
        traverseTextNodes(containerEl);
    } catch (ex) {
        if (ex == stop) {
            rangy.getSelection().setSingleRange(range);
        } else {
            throw ex;
        }
    }
}
/*************************************************/

function getSelectionHtml() { //got function from stackoverflow
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return html;
} //

function setBottomBar(){
		var myText = getSelectionHtml();
		document.getElementById(":9x").innerHTML = "<span id='bottomBarAddition' style='float:right'>"+myText+"</span>";
		debug.debug(":9x DIV html = " + document.getElementById(":9x").innerHTML);
}


$(window).resize(function(){
	// ToDo: do something...

    $(".s4").width($("#subjectiveDropdown").width());

    var leftRange = $("#verbalucce_anime").offset().left;
    var rightRange = leftRange + $("#verbalucce_anime").width();
    xScale = d3.scale.linear()
        //.domain([0,d3.max(mergedData)])
        .domain([0,1])
        .range([0, d3.select("#verbalucce_anime").style("width")]);

    svg
        .attr("width",d3.select("#verbalucce_anime").style("width"))
        .attr("height",(parseInt(d3.select("#verbalucce_anime").style("height").replace("px"))/1.5)+"px");


    debug.debug("anime height: "+d3.select("#verbalucce_anime").style("height"));
    debug.debug("anime width: "+d3.select("#verbalucce_anime").style("width"));

    var line = svg.select("path");
    line.attr("d","M 0 " + (parseInt(d3.select("svg").style("height").replace("px"))/2) + " L " + (d3.select("svg").style("width").replace("px","")) + " " + (parseInt(d3.select("svg").style("height").replace("px"))/2) + " z")
        .style("stroke-width",1)
        .style("stroke","#000");

    circle = svg.select("circle");
    circle
        .transition()
        .duration(1500)
        .ease("elastic")
        .attr("cx",xScale(storedVerbalucceScore))
        .attr("cy",(parseInt(d3.select("svg").style("height").replace("px"))/2)+"px")
        .attr("r",(parseInt(d3.select("svg").style("height").replace("px"))/2)+"px");

    var t = d3.select("text");
    t
        .transition()
        .duration(1500)
        .ease("elastic")
        .attr("x",xScale(storedVerbalucceScore))
        .style("text-anchor","middle")
        .attr("y",(parseInt(d3.select("svg").style("height").replace("px"))/2 + 5)+"px" )
        .text(storedVerbalucceScore);
    
});

