#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import division
import time
import datetime
import threading
import getpass
import re
import os
import ast
import sys
sys.path.append("/usr/local/lib/python2.7/site-packages")

import nltk
import csv
from optparse import OptionParser

from gmail.gmail import Gmail
from Verbalucce import verbalucce
from Verbalucce import relational_db as rdb


CAMOU       = ""
totalTime   = 0
OUTPUT_DIR  = ""
UNIGRAM_THREASHOLD = 1
BIGRAM_THREASHOLD = 1
TRIGRAM_THREASHOLD = 1

def main():
    global CAMOU, totalTime, OUTPUT_DIR

    OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "../output/")) + "/"
    print "Output directory: ", OUTPUT_DIR
    DEBUG = 0
    USER = ""
    FROM = ""
    TO = ""
    SEARCH_CRITERIA = ""
    FULL = False

    email_index = 1

    parser = OptionParser()
    parser.add_option("-u", "--user", dest="c_user",
                      help="Gmail login address")
    parser.add_option("-f", "--from", dest="c_from",
                      help="from email address to be searched")
    parser.add_option("-t", "--to", dest="c_to",
                      help="to email address to be searched")
    parser.add_option("-i", action="store", type = "int", dest="email_index",
                      help="email index (default: 0)")
    parser.add_option("-c", "--camouflage", dest="c_camouflage",
                      help="camouflage id for the contact")
    parser.add_option("--full", action = "store_true", dest="c_full",
                      help="get full history")
    parser.add_option("--uid", action="store", type = "int", dest="c_uid",
                      help="fetch email with specific uid")
    parser.add_option("-b", dest="c_before",
                      help="Before UTC time")
    parser.add_option("-a", dest="c_after",
                      help="After UTC time")
    parser.add_option("--filter", dest="c_filter",
                      help="Filter type")
    parser.add_option("--start", action="store", type = "int", dest = "c_start",
                      help= "start # of emails to fetch")
    parser.add_option("--stop", action="store", type = "int", dest = "c_stop",
                      help= "stop # of emails to fetch")



    (options, args) = parser.parse_args()

    print options

    if (options.c_user):
        USER = options.c_user
        PWD = getpass.getpass()
    if (options.email_index):
        email_index = options.email_index
    if (options.c_full):
        FULL = True;


    if (USER==""):
        print "Please provide user email address using -u <email> \nExiting ..."
        raise SystemExit


    g = Gmail()

    result = g.login(USER, PWD)

    if (options.c_uid):
        emails = g.inbox().mail(uid=options.c_uid)
    if (options.c_filter == 'duration'):
        starttime = datetime.datetime.utcfromtimestamp(int(options.c_after))
        endtime  = datetime.datetime.utcfromtimestamp(int(options.c_before))

        print "search duration:", starttime, "~",  endtime

        if (options.c_from):
            emails = g.inbox().mail(fr=options.c_from, before=endtime, after=starttime)
            FROM = options.c_from
            TO = USER
        elif (options.c_to):
            emails = g.sent().mail(to=options.c_to, before=endtime, after=starttime)
            FROM = USER
            TO = options.c_to

    elif (options.c_from):
        emails = g.inbox().mail(fr=options.c_from)
        FROM = options.c_from
        TO = USER
    elif (options.c_to):
        emails = g.sent().mail(to=options.c_to)
        FROM = USER
        TO = options.c_to
    else:
        emails = g.inbox().mail()

    if (options.c_camouflage):
        CAMOU = options.c_camouflage;

    vblc = verbalucce.Verbalucce()

    threadLock = threading.Lock()
    threads = []

    print "\n From:", FROM
    print "To:", TO
    print "\n Number of emails = ", len(emails)


    # Ignore email_index if requested full content
    if (FULL):
        start = 0
        email_index = 0
    else:
        start = len(emails)-email_index-1

    stop = len(emails)-1

    if (options.c_start):
        start = options.c_start
    if (options.c_stop):
        stop = options.c_stop

    print "search emails between start, stop"

    try:
        for i in range(stop, start, -1):
            # create new thread
            print "#", i," email to be fetched", emails[i]
            emails[i].fetch()

        g.logout()

        for i in range(stop, start, -1):
            print "Run verbalucce on ",'#', i,
            email = emails[i]
            #print "\nuid:", email.uid
            #print "\nFrom:", email.fr
            #print "\nTo:", email.to
            #print "\nCC:", email.cc
            #print "\nDelivered to:", email.delivered_to
            #print "\nSent At:", email.sent_at
            #print "\nmessage_id", email.message_id
            #print "\nThread ID:", email.thread_id
            #print "\nSubject:", email.subject
            #print "\n\n====Raw Header:", email.raw_headers
            #print "\n\n====Raw Email:", email.raw_emails
            #print "\n\n======Message======\n", email.message
            #print "\n\n======Body======\n", email.body
            #print "\n\n======calendar======\n", email.calendar

            # Only search for emails specifically to USER or
            # Only search for emails specifically to target contact
            if (email.to!=None
                and email.fr!=None
                and (email.to.lower().find(TO.lower())!=-1)
                and (email.fr.lower().find(FROM.lower())!=-1)
                and (len(email.to.split("@")) == 2)
                and (email.cc==None)
                and (not(re.search("^Chat with",email.subject)))
                and email.body!=None
                and (email.body.find("BEGIN:VCALENDAR")==-1)
                and (email.calendar==None)):
                print "Starts thread [", i-email_index, "]..."
                thread = vbThread(vblc, i-email_index, email, i-email_index, FROM, TO)
                # start new thread
                thread.start()

                # Add thread to thread list
                threads.append(thread)
    except (RuntimeError, TypeError, NameError):
        print "Error:", RuntimeError, TypeError, NameError
        pass

    for t in threads:
        t.join()

    print "Exiting Main Thread"
    #g.logout()

    dbname = OUTPUT_DIR + "mail.db"
    # Write to database
    db = rdb.connect_database(dbname)
    db.text_factory = str
    cursor = db.cursor()

    try:
        print("\n\n=====Ngrams====")
        # Extract ngram from each emails and update top ngrams in RDB table
        cursor.execute('''SELECT unigrams FROM emails WHERE from_email=? AND to_email=?''', (FROM, TO,))
        allrows = cursor.fetchall()
        numOfEmails = len(allrows)
        print "Number of emails :", numOfEmails
        #print "All rows:", allrows
        unigrams = []
        for r in allrows:
            #print "row:", r
            u = ast.literal_eval(r[0])
            #print "u:", u
            unigrams = unigrams + u

        topunigrams = []
        fdist = nltk.FreqDist(unigrams)
        for sample in fdist:
            if (fdist[sample] > UNIGRAM_THREASHOLD):
                print "Sample:", sample
                print "Frequency:", fdist[sample]
                topunigrams.append(sample)

        #print "Top unigrams:", topunigrams

        cursor.execute('''SELECT bigrams FROM emails WHERE from_email=? AND to_email=?''', (FROM, TO,))
        allrows = cursor.fetchall()
        #print "All rows:", allrows
        bigrams = []
        for r in allrows:
            #print "row:", r
            b = ast.literal_eval(r[0])
            #print "b:", b
            bigrams = bigrams + b


        #print "Aggregatd bigrams:", bigrams
        topbigrams = []
        fdist = nltk.FreqDist(bigrams)
        for sample in fdist:
            if (fdist[sample] > BIGRAM_THREASHOLD):
                print "Sample:", sample
                print "Frequency:", fdist[sample]
                topbigrams.append(sample)

        #print "Top bigrams:", topbigrams

        cursor.execute('''SELECT trigrams FROM emails WHERE from_email=? AND to_email=?''', (FROM, TO,))
        allrows = cursor.fetchall()
        trigrams = []
        for r in allrows:
            #print "row:", r
            tr = ast.literal_eval(r[0])
            #print "tr:", tr
            trigrams = trigrams + tr


        #print "Aggregatd trigrams:", trigrams
        toptrigrams = []
        fdist = nltk.FreqDist(trigrams)
        for sample in fdist:
            if (fdist[sample] > BIGRAM_THREASHOLD):
                print "Sample:", sample
                print "Frequency:", fdist[sample]
                toptrigrams.append(sample)

        #print "Top trigrams:", toptrigrams
        rdb.insertOrUpdateRDB(FROM, TO, numOfEmails, topunigrams, topbigrams, toptrigrams, db)



        #print("\n\n====Table RDB====")
        #cursor.execute("PRAGMA table_info(RDB)")
        #command = 'SELECT * FROM RDB'
        #cursor.execute(command)
        #for row in cursor:
        #    print row


        outfile = open(OUTPUT_DIR+"TableEmails.dat", "wb")
        #csv.register_dialect("custom", delimiter="\t")
        #writer = csv.writer(outfile, dialect="custom")


        print("\n\n====Writing Table emails to file====")
        #cursor.execute("PRAGMA table_info(email)")
        outfile.write("uid\t" \
                "timestamp\t" \
                "num_total_words\t" \
                "num_big_words\t" \
                "num_allcaps\t" \
                "num_words_per_sentence\t" \
                "mobile\t" \
                "num_high_pos\t" \
                "num_low_pos\t" \
                "num_high_neg\t" \
                "num_low_neg")

        command = 'SELECT uid, ' \
                  'timestamp, ' \
                  'num_total_words ,' \
                  'num_big_words,' \
                  'num_allcaps ,' \
                  'num_words_per_sentence ,' \
                  'mobile,num_high_pos   ,' \
                  'num_low_pos     ,' \
                  'num_high_neg    ,' \
                  'num_low_neg FROM emails'
        cursor.execute(command)
        rows = cursor.fetchall()
        for r in rows:
            print r
            outfile.write('\n')
            outfile.write('\t'.join(str(s) for s in r))

        # Output table emails to files

        cursor.close()
        outfile.close()
        db.commit()

    except (RuntimeError, TypeError, NameError):
        print "Error:", RuntimeError, TypeError, NameError
        pass


class vbThread (threading.Thread):
    def __init__(self, vblc, threadID, email, counter, fr, to):
        threading.Thread.__init__(self)
        self.threadID   = threadID
        self.email      = email
        self.counter    = counter
        self.vblc       = vblc
        self.fr         = fr
        self.to         = to
    def run(self):
        global CAMOU, totalTime, OUTPUT_DIR, BIGRAM_THREASHOLD
        print "Starting thread"
        start = time.clock()
        # Get lock to synchronize threads
        # threadLock.acquire()
        result = self.vblc.RunVerbalucce(self.email)
        lines = self.email.body.split("\r\n")
        lines = self.vblc.extractReply(lines)

        if (CAMOU!=""):
            filename = CAMOU
        else:
            filename = self.email.fr

        filename = filename+"_"+self.email.uid+".txt"
        print "\nSaving email to ", OUTPUT_DIR + filename
        f = open(OUTPUT_DIR + filename, "wb")
        f.write('\n'.join(lines))
        f.close()

        dbname = OUTPUT_DIR + "mail.db"
        # Write to database
        db = rdb.connect_database(dbname)
        db.text_factory = str
        cursor = db.cursor()

        try:

            rdb.insertOrUpdateMailBox(self.email, self.fr, self.to, result, db)

            cursor.close()
            db.commit()
            print 'Insert Success!'

        except (RuntimeError, TypeError, NameError):
            print "Error:", RuntimeError, TypeError, NameError
            pass


        totalTime += (time.clock() - start)
        # Free lock to release next thread
        # threadLock.release()

if __name__ == '__main__':

    global totalTime
    threadStart = time.clock()
    print "Start time: ", threadStart
    main()

    print "Total execution time:", time.clock()-threadStart, " seconds"
    print "Total thread time:", totalTime, " seconds"
