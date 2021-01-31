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
  
 File: sentilsm3.js
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
// (2013-09-04 jtseng2)
//				- Branch out from sentilsm2. Supporting IDF.
// (2013-11-01 jtseng2)
//				- Modulized sentiment analysis and language style matching analysis. Used by main.js.
/*-----------------------------------------------------------------------------*/
var SentiLSM = function() {
return {

		D:				{},
		dict:			{},
		astDict:		{},
		moodAstDict:	{},
		
		initialize: function(){
			this.dict = this.D.dictionary;
			this.astDict = this.D.astDict;
			this.moodAstDict = {};
			this.extractPartialDictionary();
		
		},
		loadDictionary: function (D){
			this.D = D;
		},

		// Extract astDict from dictionary
		extractPartialDictionary: function () {
			for (key in this.astDict)
			{
				var tlist = this.astDict[key];
				for (var k = 0; k < tlist.length; k++)
				{
					var inx = tlist[k];
					
					if (inx=='126' || inx=='127' || inx=='465' || inx=='466')
					{
						this.moodAstDict[key] = tlist;
						break;
					}
				}
			}
		},

		//.............................. Get WordCount
		getWordCount: function (lines)
		{
			var wc = 0
			for (var i = 0; i < lines.length; i++)
			{
				var line = this.processline(lines[i])
				var words = line.split(/\s+/)
				if (words.length >0 && words[0].length != 0)
				{
					wc += words.length;
				}
			}
			
			return wc
		},

		//.............................. Process word in sentence
		processword: function (word)
		{
			// ToDo: put negate back by making negate global variables
			var negate = false;
			
			var word = word.toLowerCase();
			var wlen = word.length-1;

			//reset negate at the end of the sentence, aka when ".", "," or "?" is hit.
			if ((word[wlen] == ".") |
				(word[wlen] == ",") |
				(word[wlen] == "?")
				)
			{
				negate = false;
			}
			word = word.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|\,\.\:\<\>]/g, '')
			word = word.replace("\\u00a0",'')
			word = word.trim();

			return word
		},

		//.............................. Process line in content
		processline: function (line)
		{
			// content = line.trim();
			debug.debug(line);
			content = line;
			content = content.replace("~",'')
			content = content.replace("#",'')
			content = content.replace("@",'')
			content = content.replace("!",'')
			content = content.replace("-",'')
			content = content.replace("\\u00a0",'')
			content = content.trim();

			return content
		},

		//.............................. Calculate LSM score for each category
		lsm: function (p1, p2)
		{
			score = 1 - (Math.abs(p1 - p2)/(p1+p2+0.0001));

			return score;
		},

		//.............................. Calculate total LSM score base on two content
		getLSM: function (count1, wc1, count2, wc2)
		{
			if (wc1==0)
			{
				wc1 += 0.001;
			}
				
			if (wc2==0)
			{
				wc2 += 0.001;
			}

			averageLSM = (this.lsm(count1[3]/wc1, count2[3]/wc2) +         //ppron
						  this.lsm(count1[9]/wc1, count2[9]/wc2) +         //ipron
						  this.lsm(count1[10]/wc1, count2[10]/wc2) +       //article
						  this.lsm(count1[12]/wc1, count2[12]/wc2) +       //auxverb
						  this.lsm(count1[16]/wc1, count2[16]/wc2) +       //adverb
						  this.lsm(count1[17]/wc1, count2[17]/wc2) +       //prep
						  this.lsm(count1[18]/wc1, count2[18]/wc2) +       //conj
						  this.lsm(count1[19]/wc1, count2[19]/wc2) +       //negate
						  this.lsm(count1[20]/wc1, count2[20]/wc2))/9;      //quant

			return averageLSM
		},

		partialMatch: function (word)
		{
			var match = false;
			
			for(key in this.moodAstDict)
			{
				var reg = RegExp("\\b"+key);
				match = reg.test(word)
				
				if (match)
				{
					return key;
				}
			}
			
			return "";
		},

		//.............................. get mood map based on LIWC
		getmoodmap: function (lines)
		{
			var result = {};
			var highpos, highneg, lowpos, lowneg, posemo, negemo, highar, lowar;
			var count = {};
			var content;
			var lsmcnt = {};
			
			lsmcnt['3'] = 0;
			lsmcnt['9'] = 0;
			lsmcnt['10'] = 0;
			lsmcnt['12'] = 0;
			lsmcnt['16'] = 0;
			lsmcnt['17'] = 0;
			lsmcnt['18'] = 0;
			lsmcnt['19'] = 0;
			lsmcnt['20'] = 0;

			count['126'] = 0
			count['127'] = 0
			count['465'] = 0
			count['466'] = 0
			count['501'] = 0

			highpos = 0
			lowpos  = 0
			highneg = 0
			lowneg  = 0

			for (var i = 0; i < lines.length; i++)
			{
				content = this.processline(lines[i]);

				words = content.split(/\s+/);
				
				for (var j = 0; j < words.length; j++)
				{
					var emoticon = words[j];                // Could be emoticon
					emoticon = emoticon.trim();
					var word = this.processword(words[j]);
					
					// check LIWC (dictionary is d[])
					if (this.dict.hasOwnProperty(word) || this.dict.hasOwnProperty(emoticon))
					{    
						// ToDo: the logic here makes emoticon takes precedence. Since emoticon could be a legitimate word in dictionary. Fix it later.
						if (!this.dict.hasOwnProperty(word))
						{               
							word = emoticon;
							count['501'] +=1;
						}
					}
					else
					{
						word = this.partialMatch(word);
					}
					
					if (word!="")
					{
						var tlist = this.dict[word];
						posemo = false;
						negemo = false;
						highar = false;
						lowar  = false;
						
						if (!tlist)
						{
							debug.debug(word);
						}
						
						for (var k = 0; k < tlist.length; k++)
						{
							var inx = tlist[k];
							
							count[inx] += 1;
							lsmcnt[inx] += 1;
							//   Get each word's LIWC's score
							if (inx == '19')                  // negate
							{
								negate = true;
							}
							
							if (inx == '126')                 // posemo
							{
								posemo = true;
							}
							
							if (inx == '127')                 // negemo
							{
								negemo = true;
							}
							
							if (inx == '465')                 // higharousal
							{
								highar = true;
							}
							
							if (inx == '466')                 // lowarousal
							{
								lowar = true;
							}
						}
						
						if (posemo)
						{
							if (highar)                   // Q2
							{
								highpos += 1;
							}
							else if (lowar)               // Q4
							{
								lowpos += 1;
							}
							var unique = true;
							for(var w=0;w<posWords.length;w++){
								if(word == posWords[w]){
									unique = false;
									break;
								}
							}
							if(unique){
								posWords.push(word);
							}
						}
						else if (negemo)
						{
							if (highar)                // Q1
							{
								highneg += 1;
							}
							else if (lowar)            // Q3
							{
								lowneg += 1;
							}
							var unique = true;
							for(var w=0;w<negWords.length;w++){
								if(word == negWords[w]){
									unique = false;
									break;
								}
							}
							if(unique){
								negWords.push(word);
							}
						}
					}
				}
			}

			result = {  'moodmap' : {  'highneg':highneg,
									'highpos':highpos,
									'lowneg':lowneg,
									'lowpos':lowpos,},
						'lsmcount': lsmcnt,
						'emoticoncount' : count['501']
				};

			return result;
		},

        // Get word catogery from LIWC dictionary
        getCats: function (word)
        {
            var cats = [];
            var emoticon = word;
            word = this.processword(word);
            
            // check LIWC (dictionary is d[])
            if (this.dict.hasOwnProperty(word) || this.dict.hasOwnProperty(emoticon))
			{                
				if (!this.dict.hasOwnProperty(word))
				{
                    word = emoticon;
                }
            }
            else
            {
                word = this.partialMatch(word);
            }
            
            if (word!="")
            {
                var tlist = this.dict[word];
                
                for (var k = 0; k < tlist.length; k++)
                {
                    var inx = tlist[k];
                    
                    if (cats[inx])
                    {
                        cats[inx] += 1;
                    }
                    else
                    {
                        cats[inx] = 1;
                    }
                }
                
            }
            
            return cats;
        },
    
		countLSMWords: function (lines)
		{		
			var lsmcnt = {};
			
			lsmcnt['3'] = 0;
			lsmcnt['9'] = 0;
			lsmcnt['10'] = 0;
			lsmcnt['12'] = 0;
			lsmcnt['16'] = 0;
			lsmcnt['17'] = 0;
			lsmcnt['18'] = 0;
			lsmcnt['19'] = 0;
			lsmcnt['20'] = 0;

			for (var i = 0; i < lines.length; i++)
			{
				content = this.processline(lines[i]);

				words = content.split(/\s+/);
				
				for (var j = 0; j < words.length; j++)
				{
					var emoticon = words[j];                // Could be emoticon
					var word = this.processword(words[j]);
					
					// check LIWC (dictionary is d[])
					if (this.dict.hasOwnProperty(word) || this.dict.hasOwnProperty(emoticon))
					{                
						if (!this.dict.hasOwnProperty(word))
						{
							word = emoticon;
						}
					}
					else
					{
						word = this.partialMatch(word);
					}
					
					if (word!="")
					{
						var tlist = this.dict[word];
											
						for (var k = 0; k < tlist.length; k++)
						{
							var inx = tlist[k];
							
							lsmcnt[inx] += 1;
							//   Get each word's LIWC's score
						}
						
					}
				}
			}

			return lsmcnt;
		},
		
		isAllCaps: function(str)
		{
			if (/[a-z]/i.test(str) && str.toUpperCase () == str)
				return true;
			else
				return false;
		},
		
		getAllCapsCount: function(lines)
		{
			var count = 0;
			
			for (var i=0; i<lines.length; i++)
			{
				words = lines[i].split(/\s+/);
				
				for (var j = 0; j < words.length; j++)
				{
					if (this.isAllCaps(words[j]))
					{
						count += 1;
					}
				}
			}
			
			return count;
		},

        getWordCountMatch: function (wc1, wc2)
        {
            return this.lsm(wc1, wc2);
        },
    
        getVerbalucce:function (lsmscore, wcdiscrepancy, moodmatch_score)
        {
            return ((lsmscore + wcdiscrepancy + moodmatch_score)/3);
        },
    
        getMoodMatchScore: function(moodcnt1, moodcnt2)
        {
            var moodmatch_score = (this.lsm(moodcnt1['126'], moodcnt2['126'])+
                                   this.lsm(moodcnt1['127'], moodcnt2['127'])/4);
            
            return moodmatch_score;
        },
        
		RunVerbalucce:function (lines1, lines2)
		{
			var Verbalucce={};
			var verbalucce_score = 0;
			var count1 	= this.countLSMWords(lines1);
			var wc1		= this.getWordCount(lines1);
			var count2	= this.countLSMWords(lines2);
			var wc2		= this.getWordCount(lines2);
			
			var lsmscore = this.getLSM(count1,wc1,count2,wc2);
			
			var wcmatch = this.getWordCountMatch(wc1,wc2);
			
			var moodmap1 = this.getmoodmap(lines1);
			var moodmap2 = this.getmoodmap(lines2);
			
			var allcapsCount1 = this.getAllCapsCount(lines1);
			var allcapsCount2 = this.getAllCapsCount(lines2);
			
			var moodmatch_score = (this.lsm(moodmap1.moodmap.highpos, moodmap2.moodmap.highpos)+
							   this.lsm(moodmap1.moodmap.lowpos,moodmap2.moodmap.lowpos)+
							   this.lsm(moodmap1.moodmap.highneg,moodmap2.moodmap.highneg)+
							   this.lsm(moodmap1.moodmap.lowneg, moodmap2.moodmap.lowneg))/4
							   
			var emoticonmatch_score = this.lsm(moodmap1.emoticoncount, moodmap2.emoticoncount);							   
			var allcapsmatch_score = this.lsm(allcapsCount1, allcapsCount2);
			
			if (wc1 > 50 && wc2 > 50)
			{
				verbalucce_score = (lsmscore + wcmatch + moodmatch_score + allcapsmatch_score + emoticonmatch_score)/5;
			}
			else
			{
				lsmscore = 0;
				verbalucce_score = (wcmatch + moodmatch_score + allcapsmatch_score + emoticonmatch_score)/4;
			}
			
			lsmscore            = lsmscore.toFixed(2);
			emoticonmatch_score = emoticonmatch_score.toFixed(2);
			allcapsmatch_score	= allcapsmatch_score.toFixed(2);
			moodmatch_score     = moodmatch_score.toFixed(2);
			verbalucce_score    = verbalucce_score.toFixed(2);
			
			Verbalucce = { 	'verbalucce_score': 	verbalucce_score,
							'moodmatch_score': 		moodmatch_score,
							'allcapsmatch_score': 	allcapsmatch_score,
							'emoticonmatch_score':	emoticonmatch_score,
							'lsmscore':				lsmscore,
							'moodmap1':				moodmap1.moodmap,
							'moodmap2':				moodmap2.moodmap,
							'wc1':					wc1,
							'wc2':					wc2		
						  };
			
			return Verbalucce;
		}
	}
};

