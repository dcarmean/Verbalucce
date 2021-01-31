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
#File: relational_db.py

__author__ = 'jtseng2'
import sqlite3

def insertRDB(email, db):
    cursor = db.cursor()
    try:
        cursor.execute(
            '''INSERT INTO RDB
                (contact_email)
                VALUES (?)''',
            (email,)
        )
        cursor.execute('SELECT contact_email FROM RDB WHERE contact_email=?', (email, ))

    except sqlite3.IntegrityError, e:
        print 'Contact %s already in table. ' % email

def insertOrUpdateMailBox(email, fr, to, vblc_result, db):
    #print "verbalucce result:", vblc_result
    cursor = db.cursor()
    try:
        cursor.execute(
            '''INSERT OR REPLACE INTO emails
                (uid,
                from_email,
                to_email,
                timestamp,
                _from,
                _to,
                subject,
                num_total_words ,
                num_big_words   ,
                num_allcaps,
                num_words_per_sentence  ,
                mobile          ,
                unigrams        ,
                bigrams         ,
                trigrams        ,
                num_high_pos    ,
                num_low_pos     ,
                num_high_neg    ,
                num_low_neg     ,
                num_ppron       ,
                num_ipron       ,
                num_article     ,
                num_auxiverb    ,
                num_adverb      ,
                num_prep        ,
                num_conj        ,
                num_negate      ,
                num_quant       )
                VALUES (?,?,?,?,?,?,?,?,?,?,
                        ?,?,?,?,?,?,?,?,?,?,
                        ?,?,?,?,?,?,?,?)''',
                (email.uid, fr, to, email.sent_at, email.fr, email.to, email.subject.replace("\r\n"," "),
                vblc_result['wordcount'],
                vblc_result['bigwords'],
                vblc_result['allcaps'],
                vblc_result['words_per_sentence'],
                vblc_result['mobile'],
                str(vblc_result['unigrams']),
                str(vblc_result['bigrams']),
                str(vblc_result['trigrams']),
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
                vblc_result['lsp']['quant'],)
        )

        cursor.execute('SELECT from_email, to_email FROM emails WHERE uid =?', (email.uid, ))

    except sqlite3.IntegrityError, e:
        print 'Contact %s already in table. ' % email

def insertOrUpdateRDB(fr, to, num_emails, topunigrams, topbigrams, toptrigrams, db):
    print "Insert Or Update RDB"
    print "Top bigrams", topbigrams
    cursor = db.cursor()
    try:
        cursor.execute(
            '''INSERT OR REPLACE INTO RDB
                (
                from_email,
                to_email,
                num_emails,
                top_unigrams,
                top_bigrams,
                top_trigrams)
                VALUES (?,?,?,?,?,?)''',
                (fr, to, num_emails, str(topunigrams), str(topbigrams),str(toptrigrams))
        )

        cursor.execute('SELECT from_email, to_email FROM RDB WHERE from_email=? AND to_email=?', (fr,to))

    except sqlite3.IntegrityError, e:
        print 'Contact %s already in table. ' % fr

def connect_database(db):
    try:
        dbconn = sqlite3.connect(db)
        create_tables(dbconn)
    except IOError:
        print 'Cannot connect to database. '
        return

    return dbconn

def create_tables(db):
    cursor = db.cursor()
    cursor.execute(
        '''CREATE TABLE IF NOT EXISTS RDB
        (from_email TEXT   NOT NULL,
        to_email    TEXT   NOT NULL,
        num_emails  INTEGER,
        top_unigrams TEXT,
        top_bigrams TEXT,
        top_trigrams TEXT,
        PRIMARY KEY(from_email, to_email))'''
    )
    cursor.execute(
        '''CREATE TABLE IF NOT EXISTS emails
        (uid            INTEGER NOT NULL,
        from_email      TEXT    NOT NULL,
        to_email        TEXT    NOT NULL,
        timestamp       TEXT,
        _from           TEXT,
        _to             TEXT,
        subject         TEXT,
        num_total_words INTEGER,
        num_big_words   INTEGER,
        num_allcaps     INTEGER,
        num_words_per_sentence  REAL,
        mobile          INTEGER,
        unigrams        TEXT,
        bigrams         TEXT,
        trigrams        TEXT,
        num_high_pos    INTEGER,
        num_low_pos     INTEGER,
        num_high_neg    INTEGER,
        num_low_neg     INTEGER,
        num_ppron       INTEGER,
        num_ipron       INTEGER,
        num_article     INTEGER,
        num_auxiverb    INTEGER,
        num_adverb      INTEGER,
        num_prep        INTEGER,
        num_conj        INTEGER,
        num_negate      INTEGER,
        num_quant       INTEGER,
        PRIMARY KEY(UID, from_email, to_email))'''
    )
    cursor.close()
    db.commit()