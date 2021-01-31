#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
# pulled out of grammer and cleaned up : 11/01/2012 -dmc
#

from __future__ import division
import os
import math
import datetime
from optparse import OptionParser
from datetime import timedelta
import sys, select
import os


dict_file = os.getcwd()+"/Verbalucce/LIWC2007_English100131.dic"
#dict_file = os.getcwd()+"/Verbalucce/LIWC20140128.txt"

# counters for overall context
sumscore = 0
paragraphcount = 0

pam = [
       '0','afraid',
       '1','tense',
       '2','excited',
       '3','delighted',
       '4','frustrated',
       '5','angry',
       '6','happy',
       '7','glad',
       '8','miserable',
       '9','sad',
       '10','calm',
       '11','satisfied',
       '12','gloomy',
       '13','tired',
       '14','sleepy',
       '15','serene']



LIWCq1 = ['afraid', 'tense', 'frustrated', 'angry']
LIWCq2 = ['excited', 'delighted','happy','glad']
LIWCq3 = ['miserable', 'sad', 'gloomy','tired']
LIWCq4 = ['calm','satisfied','sleepy','serene']

cat={}
count={}
subs={}
d={}

DEBUG = 0


#.............................. Read the LIWC dictionary
def load_dict():
    start = 0 
    dict = open(dict_file, "r")
    lines = dict.readlines()

    for line in lines:
    
        if (DEBUG): print line

        try:
            pline = line.index("%")
            start += 1
        
        except:
            words = line.split('\t')
            cat[words[0]] = words[1].strip()
            count[words[0]] = 0
        
        if (start == 2):
            break

    start = 0

    for line in lines:
        if (start == 2):
            tline = line.strip()
            words = tline.split('\t')
            lenn = len(words)
            keyword = words[0].replace("*", '')
            keyword = keyword.strip()
            try:
                ast = words[0].index("*")
                subs[keyword] = words[1:lenn]
            except:
                #subs[keyword] = False
                pass
        
            d[keyword] = words[1:lenn]

        else:
            try:
                pline = line.index("%")
                start += 1
            
            except:
                pass

    dict.close()
                    
    D = {'dictionary':d,
        'astDict':subs}

    return D

#result = load_dict()
#print result['dictionary']['love']
#print result['dictionary'][':)']
#print result['dictionary']['<3']
