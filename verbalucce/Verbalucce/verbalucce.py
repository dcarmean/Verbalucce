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
#File: verbalucce.py

from __future__ import division
import time
import re
import logging
import os
import ast

import nltk
from nltk.tokenize import word_tokenize, wordpunct_tokenize, sent_tokenize

from Verbalucce import liwc_dict as liwc

#create logger
logger = logging.getLogger('parser')
logger.setLevel(logging.WARNING)
# create console handler and set level to debug
ch = logging.StreamHandler()
ch.setLevel(logging.WARNING)

DEBUG = 0

class Verbalucce():
    dict_file = os.path.dirname(__file__)+"/LIWC2007_English100131.dic"
    def __init__(self):
        self.d = liwc.Dictionary()
        self.d.load_dict(self.dict_file)
        print "Verbalucce Initialized."


    #..............................isQuotedLine....................................
    # Determine if the line is the start of quoted history
    #..............................................................................
    def isQuotedHeader(self, line):
        logger.debug("Checking quoted lines")
        isQuoted = False
        words = line.split()
        wcnt=len(words)

        # On <date>, <author> wrote:
        if ((words[0]=="On" and words[wcnt-1]=="wrote:")    or
            (words[0]=="On" and words[wcnt-1].find("wrote:")) or
            (re.search("^From:", line))                     or
            (re.search("^Quot", line))                      or
            (re.search(r"\bOriginal Message\b", line))      or
            (re.search(r"\bForwarded message\b", line))     or
            (re.search(r"\bBegin forwarded message\b",line)) or
            (words[wcnt-1]=="wrote:")
            or (words[wcnt-1]==u'提到:')
            ):
            isQuoted = True

        return  isQuoted

    def isQuotedLine(self, line):
        logger.debug("Checking quoted lines")
        isQuoted = False
        words = line.split()

        if (re.search("^>", line)):
            isQuoted = True

        return isQuoted
    #..............................isFromMobile....................................
    # Determine if the line is the mobile signature
    #..............................................................................
    def isFromMobile(self, line):
        logger.debug("Checking mobile signature")
        isMobile = False

        # "Sent from my iphone/ipad..."
        if (re.search("^Sent from my ", line)):
            isMobile = True

        return  isMobile

    #.............................. Extract reply content from GMAIL...............
    #  Remove all quoted history from the reply
    #..............................................................................

    def extractReply(self, lines):
        logger.debug("Extract reply")
        content     = []

        for line in lines:
            words = line.split()
            # Get timestamp, emailer, content
            wcnt=len(words)
            if (wcnt>0):
                if (self.isQuotedHeader(line)):
                    break
                elif (self.isFromMobile(line)):
                    continue
                elif (self.isQuotedLine(line)):
                    continue
                else:
                    content.append(line)

        return content

    def getNumAllCaps(self, line):
        count = 0
        for word in line:
            if word.isupper():
                count += 1

        return count

    def getNumBigWords(self, line):
        count = 0
        for word in line:
            if len(word) > 7:
                count += 1
        return count

    def getPunctuation(self, line):
        NotImplemented
        return []

    def getNumSentences(self, line):
        sentences = sent_tokenize(line)
        #print "sentences:", sentences
        #print "Num of sentences:", len(sentences)
        return len(sentences)

    def getUnigrams(self, line):
        line = [x.lower() for x in line]
        ulist = []
        for l in line:
            x = []
            x.append(l)
            ulist.append(tuple(x))

        exclude_ulist = []
        #print "Initial unigrams:", ulist
        for item in ulist:
            lsm = self.d.getLSMProfile(item)
            if (all(lsm[v]==0 for v in lsm)):
                exclude_ulist.append(item)

        return exclude_ulist

    def getBigrams(self, line):
        blist = nltk.bigrams([x.lower() for x in line])
        exclude_blist = []
        #print "Initial bigrams:", blist
        for item in blist:
            lsm = self.d.getLSMProfile(item)
            if (all(lsm[v]==0 for v in lsm)):
                exclude_blist.append(item)
                #print "Add ", item, " to bigrams"

        #print "New bigrams:", exclude_blist
        return exclude_blist

    def getTrigrams(self, line):
        trilist = nltk.trigrams([x.lower() for x in line])
        exclude_trilist = []
        #print "Initial trigrams:", trilist
        for item in trilist:
            lsm = self.d.getLSMProfile(item)
            if (all(lsm[v]==0 for v in lsm)):
                exclude_trilist.append(item)
                #print "Add ", item, " to trigrams"

        #print "New bigrams:", exclude_trilist
        return exclude_trilist

    def RemoveHyperlink(self, line):
        #print "Before removing hyperlink: ", line
        reHTTP = re.compile(r'(http://\S+)')
        reHTTPS = re.compile(r'https://\S+')
        newline = reHTTP.sub(" ", line)
        #print "http removed: ", newline
        newline = reHTTPS.sub(" ", newline)
        #print "https removed: ", newline
        return newline

    def RunVerbalucceTest(self, email):
        result = {}
        print "RunVerbalucceTest"
        return result

    def RunVerbalucce(self, email):
        # set timer
        start = time.clock()
        # for email in emails:
        lines = email.body.split("\r\n")
        lines = self.extractReply(lines)
        #print "\nExtracted Body", lines
        wordcount = liwc.getWordCount(lines)

        unigr = []
        bigr = []
        trigr = []
        bigwords = 0
        punctuations = []
        allcaps = 0
        mobile = False
        num_sentences = 0


        result = {}

        for line in lines:
            #print "Line:", line
            line = self.RemoveHyperlink(line)
            mobile = mobile | self.isFromMobile(line)
            line = liwc.processline(line)
            #print "Processed line:", line
            num_sentences += self.getNumSentences(line)
            l = line.split()
            #print "Splitted line:", l
            bigwords += self.getNumBigWords(l)
            punctuations = punctuations + self.getPunctuation(l)
            allcaps += self.getNumAllCaps(l)
            #ToDo: Reenable ngrams later
            #unigr = unigr + self.getUnigrams(l)
            #bigr = bigr + self.getBigrams(l)
            #trigr = trigr + self.getTrigrams(l)
            #print "Bigrams:", bigr
            #print "Trigrams:", trigr

        #print "Total num sentences:", num_sentences
        if (num_sentences==0):
            num_sentences = 1
        avg_words_per_sentence = wordcount/float(num_sentences)

        result = {
            'wordcount' :   wordcount,
            'moodmap'   :   self.d.getmoodmap(lines),
            'lsp'       :   self.d.getLSMProfile(lines),
            'bigwords'  :   bigwords,
            'allcaps'   :   allcaps,
            'punctuations': punctuations,
            'words_per_sentence': avg_words_per_sentence,
            'unigrams'  :   unigr,
            'bigrams'   :   bigr,
            'trigrams'  :   trigr,
            'mobile'    :   mobile
        }

        if (DEBUG):
            print "Verbalucce Result:", result




        return  result

