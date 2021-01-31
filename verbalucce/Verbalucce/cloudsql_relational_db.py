#__author__ = 'jtseng2'
#import MySQLdb

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
#File: cloudsql_relational_db.py


import MySQLdb
import os
import decimal

# Define production Cloud SQL instance information.
_INSTANCE_NAME = <your cloud sql instance name>

def connect_db():
    if (os.getenv('SERVER_SOFTWARE') and
      os.getenv('SERVER_SOFTWARE').startswith('Google App Engine/')):
      db = MySQLdb.connect(unix_socket='/cloudsql/' + _INSTANCE_NAME, user=<username>, passwd=<password>)
    else:
      db = MySQLdb.connect(host='localhost', user=<username>, passwd=<password>)

    cursor = db.cursor()
    cursor.execute('USE rdb')

    return db

def createUserAccount(emailAddress,db):
    #print "CreateUserAccount:", emailAddress
    cursor = db.cursor()
    cursor.execute(
        '''INSERT IGNORE INTO Accounts(EmailAddress) Values(%s)''', (emailAddress,)
    )
    cursor.close()

    db.commit()

def getUserID(emailAddress, db):
    userID = None
    cursor = db.cursor()
    cursor.execute(
        '''SELECT UserID from Accounts
        WHERE EmailAddress = %s''',
        (emailAddress,)
    )
    row = cursor.fetchone()
    if row is not None:
        userID = row[0]

    cursor.close()

    return userID

def getEmailDataSchema(db):
    cursor = db.cursor()
    cursor.execute(
        '''DESC EmailData'''
    )

    rows = cursor.fetchall()
    result = ""
    for r in rows:
        result = result + r[0] + ','

    return result[:-1]

def insertOrUpdateEmailData(userid, email, fr, to, timestamp, vblc_result, db):
    cursor = db.cursor()
    cursor.execute(
        '''INSERT INTO EmailData
            (
            UserID,
            EmailUID,
            FromEmailAddress,
            ToEmailAddress,
            SentAt,
            ThreadID,
            NumTotalWords ,
            NumBigWords   ,
            NumAllCaps,
            NumWordsPerSentence  ,
            Mobile          ,
            NumHighPos    ,
            NumHighNeg     ,
            NumLowPos    ,
            NumLowNeg     ,
            NumPpron       ,
            NumIpron       ,
            NumArticle     ,
            NumAuxiverb    ,
            NumAdberb      ,
            NumPrep        ,
            NumConj        ,
            NumNegate      ,
            NumQuant       ,
            NumI     ,
            NumPast    ,
            NumPresent      ,
            NumFuture        ,
            NumSwear,
            NumSocial        ,
            NumAffect,
            NumCogmech      ,
            NumDiscrep       ,
            NumCertain     ,
            NumExcl    ,
            NumBio      ,
            NumSpace        ,
            NumTime       ,
            NumWork      ,
            NumHome       )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE SentAt=SentAt''',
            (userid,
            email.uid,
            fr,
            to,
            timestamp,
            email.thread_id,
            vblc_result['wordcount'],
            vblc_result['bigwords'],
            vblc_result['allcaps'],
            vblc_result['words_per_sentence'],
            vblc_result['mobile'],
            vblc_result['moodmap']['highpos'],
            vblc_result['moodmap']['lowpos'],
            vblc_result['moodmap']['highneg'],
            vblc_result['moodmap']['lowneg'],
            vblc_result['lsp']['ppron'],
            vblc_result['lsp']['ipron'],
            vblc_result['lsp']['article'],
            vblc_result['lsp']['auxiverb'],
            vblc_result['lsp']['adverb'],
            vblc_result['lsp']['prep'],
            vblc_result['lsp']['conj'],
            vblc_result['lsp']['negate'],
            vblc_result['lsp']['quant'],
            vblc_result['lsp']['i'],
            vblc_result['lsp']['past'],
            vblc_result['lsp']['present'],
            vblc_result['lsp']['future'],
            vblc_result['lsp']['swear'],
            vblc_result['lsp']['social'],
            vblc_result['lsp']['affect'],
            vblc_result['lsp']['cogmech'],
            vblc_result['lsp']['discrep'],
            vblc_result['lsp']['certain'],
            vblc_result['lsp']['excl'],
            vblc_result['lsp']['bio'],
            vblc_result['lsp']['space'],
            vblc_result['lsp']['time'],
            vblc_result['lsp']['work'],
            vblc_result['lsp']['home'],)
    )
    cursor.close()

def insertSubjectiveFeedbackAndVerbalucceResultData(userid, data, db):
    cursor = db.cursor()
    threadid = int(data['ThreadID'],16)

    try:
        cursor.execute(
            '''INSERT INTO SubjectiveFeedbackAndVerbalucceResult
                (
                UserID,
                FromEmailAddress,
                ToEmailAddress,
                SentAt,
                ThreadID,
                Warm ,
                Cold   ,
                Positive,
                Negative  ,
                VerbalucceScore          ,
                LanguageStyleMatch    ,
                MoodMatch     ,
                AllCapsMatch     ,
                EmoticonMatch       ,
                NumHighPos1    ,
                NumHighNeg1     ,
                NumLowPos1    ,
                NumLowNeg1     ,
                NumHighPos2    ,
                NumHighNeg2     ,
                NumLowPos2    ,
                NumLowNeg2       ,
                NumWordCount1     ,
                NumWordCount2)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                        %s,%s,%s,%s)''',
                (userid,
                data['FromEmailAddress'],
                data['ToEmailAddress'],
                data['SentAt'],
                threadid,
                data['SubjectiveValues']['warm'],
                data['SubjectiveValues']['cold'],
                data['SubjectiveValues']['positive'],
                data['SubjectiveValues']['negative'],
                data['VerbalucceResult']['verbalucce_score'],
                data['VerbalucceResult']['lsmscore'],
                data['VerbalucceResult']['moodmatch_score'],
                data['VerbalucceResult']['allcapsmatch_score'],
                data['VerbalucceResult']['emoticonmatch_score'],
                data['VerbalucceResult']['moodmap1']['highpos'],
                data['VerbalucceResult']['moodmap1']['lowpos'],
                data['VerbalucceResult']['moodmap1']['highneg'],
                data['VerbalucceResult']['moodmap1']['lowneg'],
                data['VerbalucceResult']['moodmap2']['highpos'],
                data['VerbalucceResult']['moodmap2']['lowpos'],
                data['VerbalucceResult']['moodmap2']['highneg'],
                data['VerbalucceResult']['moodmap2']['lowneg'],
                data['VerbalucceResult']['wc1'],
                data['VerbalucceResult']['wc2'],)
        )
        cursor.close()
    except Exception, e:
        print str(e);
        return

def getAllEmailData(userid, fr, to, db):
    cursor = db.cursor()
    cursor.execute(
        '''SELECT * FROM EmailData
        WHERE UserID=%s AND FromEmailAddress=%s AND ToEmailAddress=%s''',
        (userid,
        fr,
        to)
    )

    result = []
    for row in cursor.fetchall():
        record = []
        for i in row:
            record.append(i)
        result.append(record)

    cursor.close()

    #print result

    return result

def getLanguageMarkerDataByTime(userid, db, starttime, endtime):
    cursor = db.cursor()
    cursor.execute(
        '''select
        FromEmailAddress,
        ToEmailAddress,
        Sum(NumTotalWords) as SumPercTotalWords,
        SUM(NumBigWords)/SUM(NumTotalWords) as SumPercBigWords,
        SUM(NumArticle)/SUM(NumTotalWords) as SumPercArticle,
        SUM(NumI)/SUM(NumTotalWords) as SumPercI,
        SUM(NumPresent)/SUM(NumTotalWords) as SumPercPresent,
        SUM(NumDiscrep)/SUM(NumTotalWords) as SumPercDiscrep,
        SUM(NumBio)/SUM(NumTotalWords) as SumPercBio,
        SUM(NumHighNeg+NumLowNeg)/SUM(NumTotalWords) as SumPercNegEmo,
        SUM(NumHighPos+NumLowPos)/SUM(NumTotalWords) as SumPercPosEmo,
        SUM(NumCogmech)/SUM(NumTotalWords) as SumPercCogmech,
        SUM(NumExcl)/SUM(NumTotalWords) as SumPercExcl,
        SUM(NumFuture)/SUM(NumTotalWords) as SumPercFuture,
        SUM(NumPast)/SUM(NumTotalWords) as SumPercPast,
        SUM(NumTime)/SUM(NumTotalWords) as SumPercTime,
        SUM(NumPrep)/SUM(NumTotalWords) as SumPercPrep,
        SUM(NumNegate)/SUM(NumTotalWords) as SumPercNegate,
        SUM(NumCertain)/SUM(NumTotalWords) as SumPercCertain,
        SUM(NumSocial)/SUM(NumTotalWords) as SumPercSocial,
        SUM(NumSpace)/SUM(NumTotalWords) as SumPercSpace,
        SUM(NumWork)/SUM(NumTotalWords) as SumPercWork,
        SUM(NumHome)/SUM(NumTotalWords) as SumPercHome,
        SUM(NumPpron)/SUM(NumTotalWords) as SumPercPpron,
        SUM(NumAffect)/SUM(NumTotalWords) as SumPercAffect,
        SUM(NumSwear)/SUM(NumTotalWords) as SumPercSwear,
        SUM(NumWordsPerSentence)/SUM(NumTotalWords) as SumPercWordsPerSentence,
        SUM(NumHighPos)/SUM(NumTotalWords) as SumPercHighPos,
        SUM(NumLowPos)/SUM(NumTotalWords) as SumPercLowPos,
        SUM(NumHighNeg)/SUM(NumTotalWords) as SumPercHighNeg,
        SUM(NumLowNeg)/SUM(NumTotalWords) as SumPercLowNeg
        from EmailData where UserID=%s AND SentAt between %s AND %s Group by FromEmailAddress, ToEmailAddress''',
        (userid, starttime, endtime,)
    )

    result = {}
    data = []

    field_names = [i[0] for i in cursor.description]

    for row in cursor.fetchall():
        record = []
        for i in row:
            if type(i)==decimal.Decimal:
                i = float(i)
            record.append(i)
        data.append(record)

    cursor.close()

    result['FieldNames'] = field_names
    result['data'] = data

    return result

def getLanguageMarkerDataAll(userid, db):
    cursor = db.cursor()
    cursor.execute(
        '''select
        FromEmailAddress,
        ToEmailAddress,
        Sum(NumTotalWords) as SumPercTotalWords,
        SUM(NumBigWords)/SUM(NumTotalWords) as SumPercBigWords,
        SUM(NumArticle)/SUM(NumTotalWords) as SumPercArticle,
        SUM(NumI)/SUM(NumTotalWords) as SumPercI,
        SUM(NumPresent)/SUM(NumTotalWords) as SumPercPresent,
        SUM(NumDiscrep)/SUM(NumTotalWords) as SumPercDiscrep,
        SUM(NumBio)/SUM(NumTotalWords) as SumPercBio,
        SUM(NumHighNeg+NumLowNeg)/SUM(NumTotalWords) as SumPercNegEmo,
        SUM(NumHighPos+NumLowPos)/SUM(NumTotalWords) as SumPercPosEmo,
        SUM(NumCogmech)/SUM(NumTotalWords) as SumPercCogmech,
        SUM(NumExcl)/SUM(NumTotalWords) as SumPercExcl,
        SUM(NumFuture)/SUM(NumTotalWords) as SumPercFuture,
        SUM(NumPast)/SUM(NumTotalWords) as SumPercPast,
        SUM(NumTime)/SUM(NumTotalWords) as SumPercTime,
        SUM(NumPrep)/SUM(NumTotalWords) as SumPercPrep,
        SUM(NumNegate)/SUM(NumTotalWords) as SumPercNegate,
        SUM(NumCertain)/SUM(NumTotalWords) as SumPercCertain,
        SUM(NumSocial)/SUM(NumTotalWords) as SumPercSocial,
        SUM(NumSpace)/SUM(NumTotalWords) as SumPercSpace,
        SUM(NumWork)/SUM(NumTotalWords) as SumPercWork,
        SUM(NumHome)/SUM(NumTotalWords) as SumPercHome,
        SUM(NumPpron)/SUM(NumTotalWords) as SumPercPpron,
        SUM(NumAffect)/SUM(NumTotalWords) as SumPercAffect,
        SUM(NumSwear)/SUM(NumTotalWords) as SumPercSwear,
        SUM(NumWordsPerSentence)/SUM(NumTotalWords) as SumPercWordsPerSentence,
        SUM(NumHighPos)/SUM(NumTotalWords) as SumPercHighPos,
        SUM(NumLowPos)/SUM(NumTotalWords) as SumPercLowPos,
        SUM(NumHighNeg)/SUM(NumTotalWords) as SumPercHighNeg,
        SUM(NumLowNeg)/SUM(NumTotalWords) as SumPercLowNeg
        from EmailData where UserID=%s Group by FromEmailAddress, ToEmailAddress''',
        (userid,)
    )

    result = {}
    data = []

    num_fields = len(cursor.description)
    field_names = [i[0] for i in cursor.description]

    for row in cursor.fetchall():
        record = []
        for i in row:
            if type(i)==decimal.Decimal:
                i = float(i)
            record.append(i)
        data.append(record)

    cursor.close()

    result['FieldNames'] = field_names
    result['data'] = data

    return result

def getLanguageMarkers(userid, db):
    cursor = db.cursor()
    cursor.execute(
        '''
        SELECT EmailUID, FromEmailAddress, ToEmailAddress,
        (NumI-NumArticle-NumBigWords+NumPresent+NumDiscrep)/(NumTotalWords) as Informality,
        (NumI+NumBio+NumHighNeg+NumLowNeg-NumHighPos-NumLowPos)/(NumTotalWords) as Depression,
        (NumHighPos+NumLowPos-NumI+NumBigWords+NumCogMech+NumExcl+NumFuture-NumPast-NumTime)/(NumTotalWords) as Age,
        (NumI-NumBigWords+NumNegate-NumArticle-NumPrep+NumCertain+NumSocial+NumPresent-NumSpace-NumWork+NumHome)/(NumTotalWords) as Female,
        (NumPpron+NumAffect)/(NumTotalWords) as SocialEmotional
        FROM EmailData
        WHERE UserID = %s''',
        (userid,)
    )

    result = []
    for row in cursor.fetchall():
        record = []
        for i in row:
            record.append(i)
        result.append(record)

    cursor.close()

    return result

def isContactInDB(userid,contact,db):
    #print contact
    cursor = db.cursor()
    cursor.execute(
        '''
        SELECT COUNT(*) from EmailData
        WHERE UserID=%s AND (FromEmailAddress=%s OR ToEmailAddress=%s)
        ''',
        (userid, contact,contact,)
    )

    result = cursor.fetchone()
    #print result
    cursor.close

    return result[0]

def isContactInDBByTime(userid,contact, starttime, endtime,db):
    print contact
    cursor = db.cursor()
    cursor.execute(
        '''
        SELECT COUNT(*) from EmailData
        WHERE UserID=%s AND (FromEmailAddress=%s OR ToEmailAddress=%s) AND SentAt between %s and %s
        ''',
        (userid, contact,contact, starttime, endtime)
    )

    result = cursor.fetchone()
    #print result
    cursor.close

    return result[0]

def isEmailInDB(userid,uid,db):
    cursor = db.cursor()
    cursor.execute(
        '''
        SELECT COUNT(*) from EmailData
        WHERE UserID=%s AND EmailUID=%s
        ''',
        (userid, uid)
    )

    result = cursor.fetchone()
    #print result
    cursor.close

    return result[0]

def deleteUserData(userid, db):
    cursor = db.cursor()
    cursor.execute(
        '''DELETE FROM EmailData
        WHERE UserID=%s''',
        (userid,)
    )
    cursor.close()
    db.commit()
