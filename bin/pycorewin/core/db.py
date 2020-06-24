import sqlite3
import os
import json
from .image import getDimension


conn = None
cur = None


def addProject(data):
    global conn
    global cur

    isCreated = 'false'
    # ( '1', 'Default', 'default-123123', 'region/classification/segmentation', 'image/video', 'x://fake-path//' )
    #   idx text,
    #   name text,
    #   key text,
    #   file text,
    #   output_path text
    #   permanent text (true or false)
    #   num_files integer
    #   classification text
    #   region text
    #   segmentation text
    if 'idx' in data and 'name' in data and 'key' in data \
            and 'file' in data and 'output_path' in data and 'permanent' in data \
            and 'classification' in data and 'region' in data and 'segmentation' in data:
        classi_in_str = json.dumps(data['classification'])
        regi_in_str = json.dumps(data['region'])
        segme_in_str = json.dumps(data['segmentation'])

        cur.execute("""INSERT INTO annoprojects VALUES (%d,'%s','%s','%s','%s','%s',0,'%s','%s','%s')""" %
                    (data['idx'], data['name'], data['key'], data['file'], data['output_path'],
                     data['permanent'], classi_in_str, regi_in_str, segme_in_str))
        conn.commit()
        isCreated = 'true'
    conn.close()
    return isCreated


def removeProject(data):
    global conn
    global cur

    isDeleted = 'false'
    if 'idx' in data:
        cur.execute("""DELETE FROM annoprojects WHERE idx = %d""" %
                    (data['idx']))
        cur.execute("""DELETE FROM annodata WHERE project_id = %d""" %
                    data['idx'])
        conn.commit()
        isDeleted = 'true'
    conn.close()
    return isDeleted


def getAllProjects():
    global conn
    global cur

    cur.execute("SELECT * FROM annoprojects")
    proj = cur.fetchall()
    projdicts = []
    for p in proj:
        projdicts.append({
            'idx': p[0],
            'name': p[1],
            'key': p[2],
            'file': p[3],
            'outputPath': p[4],
            'permanent': p[5],
            'numFiles': p[6],
            'classification': p[7],
            'region': p[8],
            'segmentation': p[9]
        })
    conn.commit()
    conn.close()
    return projdicts


def initAnno():
    global conn
    global cur

    # ( '1', 'Default', 'default-123123', 'region/classification/segmentation', 'image/video', 'x://fake-path//' )
    cur.execute("""CREATE TABLE IF NOT EXISTS annoprojects (
        idx INTEGER,
        name TEXT,
        key TEXT,
        file TEXT,
        output_path TEXT,
        permanent TEXT,
        num_files INTEGER,
        classification TEXT,
        region TEXT,
        segmentation TEXT)""")
    cur.execute("""CREATE TABLE IF NOT EXISTS annodata (
        idx INTEGER,
        name TEXT,
        path TEXT,
        key TEXT,
        project_name TEXT,
        project_id INTEGER,
        width INTEGER,
        height INTEGER)""")
    conn.commit()
    conn.close()
    return 'true'


def addData(data):
    global conn
    global cur
    isAdded = 'false'

    if 'idx' in data and 'name' in data and 'path' in data and 'key' in data and 'project_name' in data and 'project_id' in data:
        try:
            dims = getDimension(data)
            if(dims['isSuccess'] == 'true'):
                num_files = data['idx'] + 1
                cur.execute("""UPDATE annoprojects SET num_files = %d WHERE idx = %d AND name = '%s' """ % (
                    num_files, data['project_id'], data['project_name']))
                cur.execute("""INSERT INTO annodata VALUES (%d, '%s','%s', '%s','%s', %d, %d, %d)
                    """ % (data['idx'], data['name'], data['path'], data['key'],
                           data['project_name'], data['project_id'], dims['width'], dims['height']))
                isAdded = 'true'
                conn.commit()
            else:
                isAdded = 'false'
        except Exception:
            isAdded = 'false'
    conn.close()
    return {'isAdded': isAdded, 'numFiles': num_files, 'width': dims['width'], 'height': dims['height']}


def removeData(data):
    global conn
    global cur
    isRemove = 'false'
    if 'idx' in data and 'name' in data and 'path' in data and 'project_id' in data:
        try:
            cur.execute("""DELETE FROM annodata WHERE project_id = %d AND idx = %d AND name = '%s' AND path = '%s'""" %
                        (data['project_id'], data['idx'], data['name'], data['path']))
            isRemove = 'true'
            conn.commit()
        except Exception:
            isRemove = 'false'
    conn.close()
    return isRemove


def removeAllFiles(data):
    global conn
    global cur
    isRemove = 'false'

    if 'project_id' in data and 'project_name' in data:
        try:
            cur.execute("""DELETE FROM annodata WHERE project_id = %d""" %
                        (data['project_id']))
            cur.execute("""UPDATE annoprojects SET num_files = 0 WHERE idx = %d AND name = '%s' """ % (
                data['project_id'], data['project_name']))
            isRemove = 'true'
            conn.commit()
        except Exception:
            isRemove = 'false'
    conn.close()
    return isRemove


def getFiles(data):
    global conn
    global cur

    files = []
    if 'max' in data and 'min' in data and 'project_id' in data and 'project_name' in data:
        try:
            cur.execute("""SELECT * FROM annodata WHERE idx >= %d AND idx <= %d AND project_name = '%s' """ %
                        (data['min'], data['max'], data['project_name']))
            filesraw = cur.fetchall()
            for f in filesraw:
                files.append({
                    'idx': f[0],
                    'name': f[1],
                    'path': f[2],
                    'key': f[3],
                    'projectName': f[4],
                    'projectId': f[5],
                    'width': f[6],
                    'height': f[7]
                })
            conn.commit()
        except Exception:
            files = []
    conn.close()
    return files


def checkData(data):
    global conn
    global cur
    isUnique = 'true'

    if 'name' in data and 'path' in data and 'project_id' in data:
        try:
            cur.execute("""SELECT * FROM annodata WHERE name = "%s" AND path = "%s" AND project_id = %d """ %
                        (data['name'], data['path'], data['project_id']))
            proj = cur.fetchall()
            if(len(proj) > 0):
                isUnique = 'false'
        except Exception:
            isUnique = 'false'
    conn.commit()
    conn.close()
    return isUnique


def updateNameProject(data):
    global conn
    global cur

    try:
        cur.execute("""UPDATE annoprojects SET name = '%s', key= '%s' WHERE idx = %d""" % (
            data['name'], data['key'], data['idx']))
        conn.commit()
        conn.close()
    except Exception as e:
        conn.close()
        return str(e)
    return 'return'


def updateTaskSetup(data):
    global conn
    global cur

    isUpdated = 'false'
    if 'idx' in data and 'task' in data and 'setup' in data:
        try:
            setup_in_str = json.dumps(data['setup'])
            cur.execute("""UPDATE annoprojects SET %s = '%s' WHERE idx = %d""" %
                        (data['task'], setup_in_str, data['idx']))
            conn.commit()
            isUpdated = 'true'
        except Exception:
            isUpdated = 'false'
    conn.close()
    return isUpdated


def dbmain(data):
    global conn
    global cur

    DB_DIR = os.path.abspath(data['mainDB'])
    DB_FILE = 'anno.db'

    try:
        if not os.path.exists(DB_DIR):
            os.mkdir(DB_DIR)
    except Exception as e:
        return 'Failed to create db - {}, w/ error - {}'.format(os.path.join(DB_DIR), str(e))

    # Connection
    conn = sqlite3.connect(os.path.join(DB_DIR, DB_FILE))
    # Cursor
    cur = conn.cursor()

    if 'sub' in data:
        if data['sub'] == 'init':
            res = initAnno()
            conn = None
            cur = None
            return res
        elif data['sub'] == 'add-project':
            res = addProject(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'get-projects':
            res = getAllProjects()
            conn = None
            cur = None
            return res
        elif data['sub'] == 'update-project-name':
            res = updateNameProject(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'remove-project':
            res = removeProject(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'add-data':
            res = addData(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'check-data':
            res = checkData(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'get-files':
            res = getFiles(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'remove-data':
            res = removeData(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'remove-all-files':
            res = removeAllFiles(data)
            conn = None
            cur = None
            return res
        elif data['sub'] == 'task-setup':
            res = updateTaskSetup(data)
            conn = None
            cur = None
            return res
        else:
            return ''
    else:
        conn.close()
        cur = None
        conn = None
        raise Exception('PyCore: Database need sub key with valid data')
