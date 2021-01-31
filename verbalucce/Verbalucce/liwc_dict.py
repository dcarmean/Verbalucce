#!/usr/bin/env python
# -*- coding: utf-8 -*-


#Copyright (c) 2013, Intel Corporation
#
#Licensed under the Apache License, Version 2.0 (the "License");
#you may not use this file except in compliance with the License.
#You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
#Unless required by applicable law or agreed to in writing, software
#distributed under the License is distributed on an "AS IS" BASIS,
#WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and
#limitations under the License
#
#File: liwc_dict.py


from __future__ import division
import logging
import types
import re
import random

# counters for overall context

#create logger
logger = logging.getLogger('liwc_dict')
logger.setLevel(logging.WARNING)
# create console handler and set level to debug
ch = logging.StreamHandler()
ch.setLevel(logging.WARNING)

# # create formatter
# formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
#
# # add formatter to ch
# ch.setFormatter(formatter)

# add ch to logger
logger.addHandler(ch)

class ExtendedLogRecord(logging.LogRecord):

    def getMessage(self):
        """
        Return the message for this LogRecord.

        Return the message for this LogRecord after merging any user-supplied
        arguments with the message.
        """
        if not hasattr(types, "UnicodeType"): #if no unicode support...
            msg = str(self.msg)
        else:
            try:
                msg = str(self.msg)
            except UnicodeError:
                msg = self.msg      #Defer encoding till later
        if self.args:
            msg +=' '+' '.join(map(str,self.args))
        return msg

#Patch the logging default logging class
logging.RootLogger.makeRecord=lambda self,*args: ExtendedLogRecord(*args)

DEBUG = 0
DEBUG_LSM = 0

# public interface
# get total word count
def getWordCount(lines):
    wc = 0
    for line in lines:
        line = processline(line)
        l = line.split()
        logger.debug("\n line:" + line)
        logger.debug("word count in line = " + str(len(l)))
        wc += len(l)

    return wc

#.............................. Process word in sentence
def processword(word):

    word = word.lower()

    wlen = len(word)-1

    #reset negate at the end of the sentence, aka when ".", "," or "?" is hit.
#        if ((word[wlen] == ".") |
#            (word[wlen] == ",") |
#            (word[wlen] == "?")
#            ):
#            negate = False
#            if (DEBUG_VERBOSE & NEGATE): print "End of the sentence. Negate is reset to ", negate
    word = word.replace(".",'')
    word = word.replace(",",'')
    word = word.replace(".",'')
    word = word.replace("?",'')
    #    word = word.replace(")",'')  -- dmc 6/13/2013
    #    word = word.replace("(",'')  -- dmc 6/13/2013
    #    word = word.replace(":",'')  -- dmc 6/13/2013
    word = word.replace("\\u00a0",'')

    return word

#.............................. Process line in content
def processline(line):
    try:
        # Remove http
        content = line.replace("~",' ')
        content = content.replace("#",' ')
        content = content.replace("@",' ')
        content = content.replace("!",' ')
        content = content.replace("-",' ')
        content = content.replace("\\u00a0",' ')
        content = content.replace(">",' ')
        content = content.replace(".",' ')
        content = content.replace(",",' ')


    except:
        pass

    return content

#.............................. Calculate LSM score for each category
def lsm(p1, p2):
    logger.debug("LSM")
    logger.debug("\tp1:" + str(p1))
    logger.debug("\tp2:" + str(p2))

    score = 1 - (abs(p1 - p2)/(p1+p2+0.0001))
    logger.debug("\t score = " + str(score))
    return score

#.............................. Calculate total LSM score base on two content
def getLSM(count1, wc1, count2, wc2):

    if (wc1==0):
        wc1 += 0.001

    if (wc2==0):
        wc2 += 0.001

    if (DEBUG_LSM):
        print "count1:", count1
        print "count2:", count2
        print "\n\t\tCount1\tCount2:"
        print "ppron:\t\t", count1['3'], "\t", count2['3']
        print "ipron:\t\t", count1['9'], "\t", count2['9']
        print "article:\t", count1['10'], "\t", count2['10']
        print "auxverb:\t", count1['12'], "\t", count2['12']
        print "adverb:\t\t",  count1['16'], "\t", count2['16']
        print "prep:\t\t",count1['17'], "\t", count2['17']
        print "conj:\t\t",count1['18'], "\t", count2['18']
        print "negate:\t\t",  count1['19'], "\t", count2['19']
        print "quant:\t\t",   count1['20'], "\t", count2['20']


    averageLSM = (lsm(count1['3']/wc1, count2['3']/wc2) +         #ppron
                  lsm(count1['9']/wc1, count2['9']/wc2) +         #ipron
                  lsm(count1['10']/wc1, count2['10']/wc2) +       #article
                  lsm(count1['12']/wc1, count2['12']/wc2) +       #auxverb
                  lsm(count1['16']/wc1, count2['16']/wc2) +       #adverb
                  lsm(count1['17']/wc1, count2['17']/wc2) +       #prep
                  lsm(count1['18']/wc1, count2['18']/wc2) +       #conj
                  lsm(count1['19']/wc1, count2['19']/wc2) +       #negate
                  lsm(count1['20']/wc1, count2['20']/wc2))/9     #quant


    return averageLSM
    
def getMoodLabel(moodi):
    mood = "NONE"
    
    LIWCq1 = ['afraid', 'tense', 'frustrated', 'angry']
    LIWCq2 = ['excited', 'delighted','happy','glad']
    LIWCq3 = ['miserable', 'sad', 'gloomy','tired']
    LIWCq4 = ['calm','satisfied','sleepy','serene']
    
    emoquad = random.randrange(0, 4)

    # moodi [Q1, Q2, Q4, Q3]
    # ToDo: Make the following algorithm less random
    if (moodi[0]): mood = LIWCq1[emoquad]     # Q1
    if (moodi[3]): mood = LIWCq3[emoquad]     # Q3
    if (moodi[2]): mood = LIWCq4[emoquad]     # Q4
    if (moodi[1]): mood = LIWCq2[emoquad]     # Q2
                    
    return mood

class Dictionary():
    
    def __init__(self):
        self.dict = {}
        self.astDict = {}
        self.moodAstDict = {}
        self.pamdef = {}
        self.cat = {}


    #.............................. Read the PAM dictionary
    def load_pam(self, pam_file):
        logging.debug("load pam file")
        dict = open(pam_file, "r")
        lines = dict.readlines()

        for line in lines:
            logging.debug("pam line:", line)
            tline = line.strip()
            words = tline.split(',')
            self.pamdef[words[1]] = words[0]

        dict.close()
        logging.debug("pam loaded")

    #.............................. Read the LIWC dictionary
    def load_dict(self, dict_file):
        cat={}
        count={}
        subs={}
        d={}
        start = 0
        dict = open(dict_file, "r")

        lines = dict.readlines()

        for line in lines:
            
            logger.debug(line)
            
            try:
                pline = line.index("%")
                start += 1
        
            except:
                # Use a regex to split, to avoid that tabs are recognized as a word when multiple subsequent tabs are found
                words = re.split(r"\t+", line)
                cat[words[0]] = words[1].strip()
                count[words[0]] = 0

            if (start == 2):
                break

        start = 0
        
        for line in lines:
            if (start == 2):
                tline = line.strip()
                # Use a regex to split, to avoid that tabs are recognized as a word when multiple subsequent tabs are found
                words = re.split(r"\t+", tline)
                lenn = len(words)
                keyword = words[0].replace("*", '')
                keyword = keyword.strip()
                try:
                    ast = words[0].index("*")
                    subs[keyword] = words[1:lenn]
                except:
                    pass
            
                d[keyword] = words[1:lenn]
                logger.debug("d["+ keyword+"]")
            
            else:
                try:
                    pline = line.index("%")
                    start += 1
                
                except:
                    pass

        dict.close()

        logger.debug("Dictionary closed.")

        self.dict = d
        self.astDict = subs
        self.cat = cat

        logger.debug("Extract astDict from dictionary.")
        #     Extract astDict from dictionary

        for key in self.astDict:
            logger.debug("key = " + key)
            tlist = self.astDict[key]
            for k in range(0, len(tlist)):
                logger.debug("k = " + str(k) + " of " + str(len(tlist)))
                inx = tlist[k]
                if (inx=='126' or inx=='127' or inx=='465' or inx=='466'):
                    self.moodAstDict[key] = tlist
                    break

    #.............................. Get category based on index
    def getCat(self, inx):
        return self.cat[inx]

    #.............................. Find partial matching words
    def partialMatch(self, word):
        
        match = False
        logger.debug("partialMatch: word = " + word)
        for key in self.moodAstDict:
            if (re.search("\\b"+key, word)):
                logger.debug("key found:" + key)
                return key

        return ""


    #.............................. Get PAM mood
    def getpammood(self, line):
        words = line.split()
        pammood = "NONE"
        
        for word in words:
            word = processword(word)
            if (self.pamdef.has_key(word)):
                pammood = word

        return pammood

    def getLSMProfile(self, lines):
        cnt = self.countLSMWords(lines)
        result ={'ppron':   cnt['3'],
            'ipron':    cnt['9'],
            'article':  cnt['10'],
            'auxiverb': cnt['12'],
            'adverb':   cnt['16'],
            'prep':     cnt['17'],
            'conj':     cnt['18'],
            'negate':   cnt['19'],
            'quant' :   cnt['20'],
            'i':        cnt['4'],
            'past':     cnt['13'],
            'present':  cnt['14'],
            'future':   cnt['15'],
            'swear':    cnt['22'],
            'social':   cnt['121'],
            'affect':   cnt['125'],
            'cogmech':  cnt['131'],
            'discrep' : cnt['134'],
            'certain':  cnt['136'],
            'excl':     cnt['139'],
            'bio':      cnt['146'],
            'space':    cnt['252'],
            'time':     cnt['253'],
            'work':     cnt['354'],
            'home':     cnt['357']
                };
        return result

    def countSingleLSMWords(self, line):
        lsmcnt = {}
        lsmcnt['3'] =\
        lsmcnt['9'] =\
        lsmcnt['10'] =\
        lsmcnt['12'] =\
        lsmcnt['16'] =\
        lsmcnt['17'] =\
        lsmcnt['18'] =\
        lsmcnt['19'] =\
        lsmcnt['20'] =\
        lsmcnt['4'] =\
        lsmcnt['13'] =\
        lsmcnt['14'] =\
        lsmcnt['15'] =\
        lsmcnt['22'] =\
        lsmcnt['121'] =\
        lsmcnt['125'] =\
        lsmcnt['131'] =\
        lsmcnt['134'] =\
        lsmcnt['136'] =\
        lsmcnt['139'] =\
        lsmcnt['146'] =\
        lsmcnt['252'] =\
        lsmcnt['253'] =\
        lsmcnt['354'] =\
        lsmcnt['357'] = 0

        content = processline(line)

        words = content.split()
        for word in words:
            word = processword(word)
            if (self.dict.has_key(word)):                         #check LIWC (dictionary is self.dict[])
                tlist = self.dict[word]
                for inx in tlist:
                    if (lsmcnt.has_key(inx)):
                        lsmcnt[inx] += 1
                    else:
                        lsmcnt[inx] = 0

        #print "CountSingleLSMWords", line
        #print "lsmcnt", lsmcnt
        
        return lsmcnt

    #.............................. Read lines and generate LSM score from content
    def countLSMWords(self, lines):

        lsmcnt = {}

        lsmcnt['3'] =\
        lsmcnt['9'] =\
        lsmcnt['10'] =\
        lsmcnt['12'] =\
        lsmcnt['16'] =\
        lsmcnt['17'] =\
        lsmcnt['18'] =\
        lsmcnt['19'] =\
        lsmcnt['20'] =\
        lsmcnt['4'] =\
        lsmcnt['13'] =\
        lsmcnt['14'] =\
        lsmcnt['15'] =\
        lsmcnt['22'] =\
        lsmcnt['121'] =\
        lsmcnt['125'] =\
        lsmcnt['131'] =\
        lsmcnt['134'] =\
        lsmcnt['136'] =\
        lsmcnt['139'] =\
        lsmcnt['146'] =\
        lsmcnt['252'] =\
        lsmcnt['253'] =\
        lsmcnt['354'] =\
        lsmcnt['357'] = 0

        #print "coundLSMWords:", lines
        for line in lines:
            cnt = self.countSingleLSMWords(line)
            lsmcnt['3']     += cnt['3']
            lsmcnt['9']     += cnt['9']
            lsmcnt['10']    += cnt['10']
            lsmcnt['12']    += cnt['12']
            lsmcnt['16']    += cnt['16']
            lsmcnt['17']    += cnt['17']
            lsmcnt['18']    += cnt['18']
            lsmcnt['19']    += cnt['19']
            lsmcnt['20']    += cnt['20']
            lsmcnt['4']     += cnt['4']
            lsmcnt['13']    += cnt['13']
            lsmcnt['14']    += cnt['14']
            lsmcnt['15']    += cnt['15']
            lsmcnt['22']    += cnt['22']
            lsmcnt['121']   += cnt['121']
            lsmcnt['125']   += cnt['125']
            lsmcnt['131']   += cnt['131']
            lsmcnt['134']   += cnt['134']
            lsmcnt['136']   += cnt['136']
            lsmcnt['139']   += cnt['139']
            lsmcnt['146']   += cnt['146']
            lsmcnt['252']   += cnt['252']
            lsmcnt['253']   += cnt['253']
            lsmcnt['354']   += cnt['354']
            lsmcnt['357']   += cnt['357']

        return lsmcnt


    #.............................. get mood map based on LIWC

    def getmoodmap(self,lines):
        highpos = 0
        lowpos  = 0
        highneg = 0
        lowneg  = 0
        
        for line in lines:
            r = self.getsinglemood(line)
            highpos += r['highpos']
            lowpos  += r['lowpos']
            highneg += r['highneg']
            lowneg  += r['lowneg']
        
        result = { 'highneg':highneg,
            'highpos':highpos,
            'lowneg':lowneg,
            'lowpos':lowpos};
        
        return result;

    def lookup_mood(self, line):
        moodints = []
        
        highpos = 0
        lowpos  = 0
        highneg = 0
        lowneg  = 0
        
        #    print ">", line, "<"
        moodresult = self.getsinglemood(line)
        moodints.append(moodresult['highneg'])   # Q1
        moodints.append(moodresult['highpos'])   # Q2
        moodints.append(moodresult['lowpos'])    # Q4
        moodints.append(moodresult['lowneg'])    # Q3

        #    print "\t\tdata", moodints
        #    moodquads = str(highneg) + "," + str(highpos) + "," + str(lowpos) + "," + str(lowneg)
        #    return(moodquads)
        return(moodints)

    def getsinglemood(self, line):
        highpos = 0
        highneg = 0
        lowpos  = 0
        lowneg  = 0
        
        content = processline(line)
        words = content.split()
        
        for word in words:
            logger.debug("getsinglemood:" + word)
            word = processword(word)
            tlist = []
            posemo  = False
            negemo  = False
            highar  = False
            lowar   = False

            if (self.dict.has_key(word)):       #check LIWC (dictionary is self.dict[])
                tlist = self.dict[word]
            else:
                word = self.partialMatch(word)
                if (word!=""):
                    tlist = self.astDict[word]

            for inx in tlist:
                if (inx == '126'):                 #posemo
                    posemo = True
                if (inx == '127'):                 #negemo
                    negemo = True
                if (inx == '465'):                 #higharousal
                    highar = True
                if (inx == '466'):                 #lowarousal
                    lowar = True


            if (posemo):
                if (highar):                       # Q2
                    highpos += 1
                    logger.debug('highpos')
                else:
                    if (lowar):                    # Q4
                        lowpos +=1
                        logger.debug('lowpos')
            else:
                if (negemo):
                    if (highar):                   # Q1
                        highneg +=1
                        logger.debug('highneg')
                    else:
                        if (lowar):                # Q3
                            lowneg +=1
                            logger.debug('lowneg')

        
        
        result = { 'highneg':highneg,
                    'highpos':highpos,
                    'lowneg':lowneg,
                    'lowpos':lowpos}
        
        return result

