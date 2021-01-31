#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
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
#File: main.py

import webapp2
import json
import urllib2
import time
import datetime
import re
import traceback
import numpy as np
from gmail.gmail import Gmail
from Verbalucce import verbalucce
from Verbalucce import cloudsql_relational_db as cloudsqldb
from load_dictionary import load_dict
from google.appengine.api import taskqueue

def getUserID(accountInfo, db):
    g = Gmail()
    try:
        g.authenticate(accountInfo['email'], accountInfo['access_token'])
        g.logout()
        userID = cloudsqldb.getUserID(accountInfo['email'], db)
        return userID

    except Exception, e:
        print "Exception: ", str(e)
        return -1

class MainHandler(webapp2.RequestHandler):
    def get(self):
        self.response.out.write("Hello Verbalucce!!")

class JSONPHandler5(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'application/json' #;charset=utf-8'
        context = {}
        context['dictionary'] = load_dict()
        self.response.out.write(json.dumps(context))

class ImapRunVerbalucceHandler3(webapp2.RequestHandler):
    def assignTasks(self, account, contact, searchType, numEmails, starttime, endtime):
        PROCESSUNIT = 50        # magic number 50. Process 50 emails per TaskQueue

        start = numEmails - 1
        stop  = numEmails - 1 - numEmails%PROCESSUNIT

        #print "Add to task queue: start = ", start, ", stop = ", stop, ", starttime = ", starttime, ", endtime = ", endtime
        taskqueue.add(url='/worker', params={'account':account,
                                                     'contact':contact,
                                                     'searchType': searchType,
                                                     'start':start,
                                                     'stop':stop,
                                                     'starttime':starttime,
                                                     'endtime':endtime})

        # Split tasks into chunks, add to task queues for every 50 mails
        for i in range(0, numEmails/PROCESSUNIT):
            start = stop
            stop = start - PROCESSUNIT
            #print "Add to task queue: start = ", start, ", stop = ", stop
            #print "contact:", contact
            #print "searchType", searchType
            taskqueue.add(url='/worker', params={'account':account,
                                                     'contact':contact,
                                                     'searchType': searchType,
                                                     'start':start,
                                                     'stop':stop,
                                                     'starttime':starttime,
                                                     'endtime':endtime})

    def post(self):
        try:
            self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
            account = urllib2.unquote(self.request.get('account')).encode('utf-8')
            contacts = urllib2.unquote(self.request.get('contacts')).encode('utf-8')
            duration = urllib2.unquote(self.request.get('duration')).encode('utf-8')
            accountInfo = json.loads(account)
            contactsInfo = json.loads(contacts)
            durationInfo = json.loads(duration)

            username = accountInfo['email']
            access_token = accountInfo['access_token']
            targets = contactsInfo['targets']
            starttime = durationInfo['starttime']
            endtime   = durationInfo['endtime']
            #print "Duration:", starttime, "~", endtime
            after = datetime.datetime.utcfromtimestamp(starttime)
            before  = datetime.datetime.utcfromtimestamp(endtime)

            #print "contacts info:", contactsInfo
            g = Gmail()
            g.authenticate(username, access_token)

            for p in range(0, len(targets)):
                contact = targets[p]

                #print contact

                if (starttime!=-1 & endtime!=-1):
                    #print "Before:", before
                    #print "After:", after

                    emails = g.inbox().mail(fr=contact, before=before, after=after)
                    #print "AssignTask for from:", contact, ", ", len(emails), "emails between ", starttime, " and ", endtime
                    self.assignTasks(account, contact, 'from', len(emails), starttime, endtime)

                    emails = g.sent().mail(to=contact, before=before, after=after)
                    #print "AssignTask for to:", contact, ", ", len(emails), "emails between ", starttime, " and ", endtime
                    self.assignTasks(account, contact, 'to', len(emails), starttime, endtime)

                elif (starttime!=-1 & endtime==-1):
                    before = datetime.utcnow();
                    emails = g.inbox().mail(fr=contact, before=before, after=after)
                    #print "AssignTask for from:", contact, ", ", len(emails), "emails between ", starttime, " and ", endtime
                    self.assignTasks(account, contact, 'from', len(emails), starttime, endtime)

                    emails = g.sent().mail(to=contact, before=before, after=after)
                    #print "AssignTask for to:", contact, ", ", len(emails), "emails between ", starttime, " and ", endtime
                    self.assignTasks(account, contact, 'to', len(emails), starttime, endtime)

                elif (starttime==-1 & endtime!=-1):
                    emails = g.inbox().mail(fr=contact, before=before, after=after)
                    #print "AssignTask for from:", contact, ", ", len(emails), "emails between ", starttime, " and ", endtime
                    self.assignTasks(account, contact, 'from', len(emails), starttime, endtime)

                    emails = g.sent().mail(to=contact, before=before, after=after)
                    #print "AssignTask for to:", contact, ", ", len(emails), "emails between ", starttime, " and ", endtime
                    self.assignTasks(account, contact, 'to', len(emails), starttime, endtime)


                else:
                    # Get all emails from contact
                    emails = g.inbox().mail(fr=contact)
                    #print "AssignTask for from:", contact, ", ", len(emails), "emails"
                    self.assignTasks(account, contact, 'from', len(emails), starttime, endtime)

                    # Get all emails to contact
                    emails = g.sent().mail(to=contact)
                    #print "AssignTask for to:", contact, ", ", len(emails), "emails"
                    self.assignTasks(account, contact, 'to', len(emails), starttime, endtime)

            g.logout()
        except Exception, e:
            print "Exception: ", e
            print traceback.format_exc()
            self.abort(403)

class ImapRunVerbalucceWorker(webapp2.RequestHandler):
    def post(self):
        context = {}
        searchType  = self.request.get('searchType')
        contact     = self.request.get('contact')
        start       = self.request.get('start')
        stop        = self.request.get('stop')
        starttime   = self.request.get('starttime')
        endtime     = self.request.get('endtime')
        account     = self.request.get('account')
        accountInfo = json.loads(account)
        username    = accountInfo['email']
        access_token= accountInfo['access_token']
        start       = int(start)
        stop        = int(stop)

        #print "Worker: start = ", start, ", stop = ", stop
        #print "starttime = ", starttime, ", endtime = ", endtime

        starttime   = int(starttime)
        endtime     = int(endtime)

        #print "username = ", username
        #print "start = ", start, ", stop = ", stop
        #print "starttime = ", starttime, ", endtime = ", endtime
        #print "contact:", contact
        #print "searchType", searchType


        db = cloudsqldb.connect_db()
        #Worker is spawn off from RunVerbalucceHandler3, no need to do another authentication
        userID = cloudsqldb.getUserID(accountInfo['email'], db)

        try:
            vblc = verbalucce.Verbalucce()
            g = Gmail()
            g.authenticate(username, access_token)

            emails = None

            #print contact

            if (starttime!=-1 & endtime!=-1):
                #print "Find emails between ", starttime, " and ", endtime
                after = datetime.datetime.utcfromtimestamp(starttime)
                before  = datetime.datetime.utcfromtimestamp(endtime)

                if (searchType =='from'):
                    emails = g.inbox().mail(fr=contact, before=before, after=after)
                    FROM = contact
                    TO = username
                elif (searchType == 'to'):
                    emails = g.sent().mail(to=contact, before=before, after=after)
                    FROM = username
                    TO = contact

            elif (starttime!=-1 & endtime==-1):
                #print "Find emails between ", starttime, " and ", endtime
                after = datetime.datetime.utcfromtimestamp(starttime)
                before  = datetime.datetime.utcnow()

                if (searchType =='from'):
                    emails = g.inbox().mail(fr=contact, before=before, after=after)
                    FROM = contact
                    TO = username
                elif (searchType == 'to'):
                    emails = g.sent().mail(to=contact, before=before, after=after)
                    FROM = username
                    TO = contact

            elif (starttime==-1 & endtime!=-1):
                #print "Find emails between ", starttime, " and ", endtime
                after = datetime.datetime.utcfromtimestamp(starttime)
                before  = datetime.datetime.utcfromtimestamp(endtime)

                if (searchType =='from'):
                    emails = g.inbox().mail(fr=contact, before=before, after=after)
                    FROM = contact
                    TO = username
                elif (searchType == 'to'):
                    emails = g.sent().mail(to=contact, before=before, after=after)
                    FROM = username
                    TO = contact

            else:
                if (searchType =='from'):
                    emails = g.inbox().mail(fr=contact)
                    FROM = contact
                    TO = username
                elif (searchType == 'to'):
                    emails = g.sent().mail(to=contact)
                    FROM = username
                    TO = contact

            #print "Number of emails:", len(emails)
            #print "From:", FROM
            #print "to:", TO

            for i in range(start, stop, -1):
                #print "#", i," email to be fetched"
                try:
                    emails[i].fetch()
                except Exception, e:
                    print "Couldn't fetch email #", i
                    print str(e)
                    pass


            g.logout()

            for i in range(start, stop, -1):
                #print "Run verbalucce on #", i
                email = emails[i]
                #Only search for emails specifically to USER or
                #Only search for emails specifically to target contact
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
                    #print "UID:", email.uid
                    if (cloudsqldb.isEmailInDB(userID, email.uid, db)):
                        #print "Email(UID", email.uid,") is found. Skipping.."
                        continue
                    r = vblc.RunVerbalucce(email)
                    timestamp = email.sent_at
                    timestamp = time.mktime(timestamp.timetuple())
                    cloudsqldb.insertOrUpdateEmailData(userID, email, FROM, TO, timestamp, r, db)

            #g.logout()
            db.commit()
            db.close()
            print "Successful verbalucce run!"
            #print context
        except Exception, e:
            print "Exception:", str(e)
            print traceback.format_exc()

class CloudSqlGetNumEmailSentToContactsHandler(webapp2.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        contacts = urllib2.unquote(self.request.get('contacts')).encode('utf-8')
        accountInfo = json.loads(account)
        contactInfo = json.loads(contacts)

        username = accountInfo['email']
        access_token = accountInfo['access_token']

        g = Gmail()
        try:
            g.authenticate(username, access_token)

            context = {}
            for contact in contactInfo['contacts']:
                emails = None
                emails = g.sent().mail(to=contact)
                numEmails = len(emails)
                context[contact]=numEmails

            g.logout()
            self.response.out.write(json.dumps(context))

        except Exception, e:
            print "Authentication failure."
            print "Error:",str(e)
            return



class CloudSqlGetVerbalucceDataHandler(webapp2.RequestHandler):
    def post(self):
        db = cloudsqldb.connect_db()
        context = {}
        self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        accountInfo = json.loads(account)
        username = accountInfo['email']
        userID = getUserID(accountInfo,db)
        if(userID==-1):
            print "Authentication failure for ", username
            self.abort(403)
        action = urllib2.unquote(self.request.get('action')).encode('utf-8')
        actionInfo = json.loads(action)
        targets = actionInfo['targets']
        searchType = actionInfo['searchType']
        filter = actionInfo['filter']
        filterValue = actionInfo['filterValue']

        for p in range(0, len(targets)):
            contact = targets[p]
            result = None
            #print contact

            if (filter == 'duration'):
                starttime = datetime.datetime.utcfromtimestamp(filterValue['after'])
                endtime  = datetime.datetime.utcfromtimestamp(filterValue['before'])

            if (searchType =='from'):
                FROM = contact
                TO = username
            elif (searchType == 'to'):
                FROM = username
                TO = contact

            #print "Search emails from:", FROM, " to:", TO

            result = cloudsqldb.getAllEmailData(userID, FROM, TO, db)
            context[contact] = result

        db.close()

        self.response.out.write(json.dumps(context))

class CloudSqlWriteSubjectiveFeedbackAndVerbalucceResultHandler(webapp2.RequestHandler):
    def post(self):
        db = cloudsqldb.connect_db()
        self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        accountInfo = json.loads(account)
        userID = getUserID(accountInfo,db)
        if(userID==-1):
            print "Authentication failure for ", accountInfo['email']
            self.abort(403)

        try:
            verbalucceData = urllib2.unquote(self.request.get('verbalucceData')).encode('utf-8')
            verbalucceDataInJSON = json.loads(verbalucceData)

            cloudsqldb.insertSubjectiveFeedbackAndVerbalucceResultData(userID,verbalucceDataInJSON,db)

            db.commit()
            db.close()
        except Exception, e:
            print str(e)

class CloudSqlCreateUserAccountHandler(webapp2.RequestHandler):
    def post(self):
        userEmail = urllib2.unquote(self.request.get('useremail')).encode('utf-8')
        #print userEmail
        db = cloudsqldb.connect_db()
        cloudsqldb.createUserAccount(userEmail, db)
        userID = cloudsqldb.getUserID(userEmail, db)
        self.response.write('success!')
        db.close()

class CloudSqlDeleteUserDataHandler(webapp2.RequestHandler):
    def post(self):
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        accountInfo = json.loads(account)
        db = cloudsqldb.connect_db()
        userID = getUserID(accountInfo, db)
        if (userID==-1):
            print "Authentication failure for user:", accountInfo['email']
            self.abort(403)
        cloudsqldb.deleteUserData(userID, db)
        self.response.write('User data deleted!')
        db.close()

class CloudSqlGetEmailDataSchemaHandler(webapp2.RequestHandler):
    def get(self):
        db = cloudsqldb.connect_db()
        result = cloudsqldb.getEmailDataSchema(db)
        self.response.write(result)
        db.close()

class CloudSqlGetLanguageMarkersHandler(webapp2.RequestHandler):
    resultAllTime = None
    def getMarkerIndex(self, marker):
        return self.resultAllTime['FieldNames'].index('SumPerc'+ marker)-2

    def getZScore(self, data, m, std):
        z = (data-m)/std
        return z

    def normalize(self, data):
        m = np.mean(data)
        std = np.std(data,ddof=1)
        if (std == 0):
            std = std + 0.000000000001

        z = (data-m)/std
        return z

    def post(self):
        db = cloudsqldb.connect_db()
        self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
        starttime = urllib2.unquote(self.request.get('starttime')).encode('utf-8')
        endtime   = urllib2.unquote(self.request.get('endtime')).encode('utf-8')
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        accountInfo = json.loads(account)
        db = cloudsqldb.connect_db()
        userID = getUserID(accountInfo, db)
        if (userID==-1):
            print "Authentication failure for user:", accountInfo['email']
            self.abort(403)
        resultAllTime = cloudsqldb.getLanguageMarkerDataAll(userID,db)
        if (len(resultAllTime['data']) == 0):
            print "No data in database for ", accountInfo['email']
            self.response.write(json.dumps([]))
            return
        self.resultAllTime = resultAllTime

        data = []
        for i in range(0, len(resultAllTime['data'])):
            for j in range(2, len(resultAllTime['data'][i])):
                if resultAllTime['data'][i][j] is None:
                    resultAllTime['data'][i][j] = 0
            data.append(resultAllTime['data'][i][2:])

        d = np.array(data)
        df = None
        resultFilteredByTime = None

        if (int(starttime)<0 and int(endtime)<0):
            df = d
            resultFilteredByTime = resultAllTime
        else:
            resultFilteredByTime = cloudsqldb.getLanguageMarkerDataByTime(userID,db, starttime, endtime)
            if (len(resultFilteredByTime['data']) == 0):
                print "No data between ", starttime, " and ",endtime, "for ", accountInfo['email']
                self.response.write(json.dumps([]))
                return
            dataFiltered = []
            for i in range(0, len(resultFilteredByTime['data'])):
                for j in range(2, len(resultFilteredByTime['data'][i])):
                    if resultFilteredByTime['data'][i][j] is None:
                        resultFilteredByTime['data'][i][j] = 0
                dataFiltered.append(resultFilteredByTime['data'][i][2:])

            df = np.array(dataFiltered)

        db.close()

        # mean
        m = np.mean(d,0)

        # corrected sample standard deviation
        std = np.std(d,0,ddof=1)

        # z scores
        z = self.getZScore(df, m, std)

        # Informality
        Informality = z.T[self.getMarkerIndex('I')]-            \
                        z.T[self.getMarkerIndex('BigWords')]-   \
                        z.T[self.getMarkerIndex('Article')]+    \
                        z.T[self.getMarkerIndex('Present')]+    \
                        z.T[self.getMarkerIndex('Discrep')]

        # Female
        Female = z.T[self.getMarkerIndex('I')]-             \
                z.T[self.getMarkerIndex('BigWords')]+       \
                z.T[self.getMarkerIndex('Negate')]-         \
                z.T[self.getMarkerIndex('Article')]-        \
                z.T[self.getMarkerIndex('Prep')]+           \
                z.T[self.getMarkerIndex('Certain')]+        \
                z.T[self.getMarkerIndex('Social')]+         \
                z.T[self.getMarkerIndex('Present')]-        \
                z.T[self.getMarkerIndex('Space')]-          \
                z.T[self.getMarkerIndex('Work')]+           \
                z.T[self.getMarkerIndex('Home')]

        # Swear
        Swear = z.T[self.getMarkerIndex('Swear')]

        # BigWords
        BigWords = z.T[self.getMarkerIndex('BigWords')]

        # WordsPerSentence
        WordsPerSentence = z.T[self.getMarkerIndex('WordsPerSentence')]

        # HighPos
        HighPos = z.T[self.getMarkerIndex('HighPos')]

        # LowPos
        LowPos = z.T[self.getMarkerIndex('LowPos')]

        # HighNeg
        HighNeg = z.T[self.getMarkerIndex('HighNeg')]

        # LowNeg
        LowNeg = z.T[self.getMarkerIndex('LowNeg')]

        # TotalWords
        TotalWords = z.T[self.getMarkerIndex('TotalWords')]

        # Normalization
        zInformality        = self.normalize(Informality)
        zFemale             = self.normalize(Female)
        zSwear              = self.normalize(Swear)
        zBigWords           = self.normalize(BigWords)
        zWordsPerSentence   = self.normalize(WordsPerSentence)
        zHighPos            = self.normalize(HighPos)
        zLowPos             = self.normalize(LowPos)
        zHighNeg            = self.normalize(HighNeg)
        zLowNeg             = self.normalize(LowNeg)
        zTotalWords         = self.normalize(TotalWords)

        numRecords = len(resultFilteredByTime['data'])

        context = []
        for i in range(0, numRecords):
            r = {}
            r['from']  = resultFilteredByTime['data'][i][0]
            r['to']    = resultFilteredByTime['data'][i][1]
            r['zInformality'] = zInformality[i]
            r['zFemale'] = zFemale[i]
            r['zSwear'] = zSwear[i]
            r['zBigWords'] = zBigWords[i]
            r['zWordsPerSentence'] = zWordsPerSentence[i]
            r['zHighPos'] = zHighPos[i]
            r['zLowPos'] = zLowPos[i]
            r['zHighNeg'] = zHighNeg[i]
            r['zLowNeg'] = zLowNeg[i]
            r['zTotalWords'] = zTotalWords[i]
            context.append(r)

        self.response.write(json.dumps(context))

class CloudSqlIsContactInDBHandler(webapp2.RequestHandler):
    def post(self):
        db = cloudsqldb.connect_db()
        self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
        contact = urllib2.unquote(self.request.get('contact')).encode('utf-8')
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        accountInfo = json.loads(account)
        db = cloudsqldb.connect_db()
        userID = getUserID(accountInfo, db)
        if (userID==-1):
            print "Authentication failure for user:", accountInfo['email']
            self.abort(403)
        result = cloudsqldb.isContactInDB(userID, contact, db)
        if (result > 0):
            self.response.write('true')
        else:
            self.response.write('false')

class CloudSqlIsContactInDBByTimeHandler(webapp2.RequestHandler):
    def post(self):
        db = cloudsqldb.connect_db()
        self.response.headers['Content-Type'] = 'application/json;charset=utf-8'
        contact = urllib2.unquote(self.request.get('contact')).encode('utf-8')
        account = urllib2.unquote(self.request.get('account')).encode('utf-8')
        duration = urllib2.unquote(self.request.get('duration')).encode('utf-8')
        accountInfo = json.loads(account)
        durationInfo = json.loads(duration)
        db = cloudsqldb.connect_db()
        userID = getUserID(accountInfo, db)
        if (userID==-1):
            print "Authentication failure for user:", accountInfo['email']
            self.abort(403)
        result = cloudsqldb.isContactInDBByTime(userID, contact, duration['starttime'], duration['endtime'], db)
        if (result > 0):
            self.response.write('true')
        else:
            self.response.write('false')

app = webapp2.WSGIApplication([('/', MainHandler)
                               ,('/jsonp5',JSONPHandler5)
                               ,('/runverbalucce3', ImapRunVerbalucceHandler3)
                               ,('/worker', ImapRunVerbalucceWorker)
                               ,('/cloudsqlcreateuseraccount', CloudSqlCreateUserAccountHandler)
                               ,('/cloudsqlgetverbaluccedata', CloudSqlGetVerbalucceDataHandler)
                               ,('/cloudsqlgetemaildataschema',CloudSqlGetEmailDataSchemaHandler)
                               ,('/cloudsqldeleteuserdata',CloudSqlDeleteUserDataHandler)
                               ,('/cloudsqlgetlanguagemarkers',CloudSqlGetLanguageMarkersHandler)
                               ,('/cloudsqlgetnumemailssenttocontacts',CloudSqlGetNumEmailSentToContactsHandler)
                               ,('/cloudsqliscontactindb', CloudSqlIsContactInDBHandler)
                               ,('/cloudsqliscontactindbbytime', CloudSqlIsContactInDBByTimeHandler)
                               ,('/cloudsqlwritesubjectivefeedbackandverbalucceresult',CloudSqlWriteSubjectiveFeedbackAndVerbalucceResultHandler)
                               ],
                              debug=True)