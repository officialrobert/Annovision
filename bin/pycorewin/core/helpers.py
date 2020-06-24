import xml.etree.ElementTree as ET
import json
import platform
import os


def getAppProperties(path):
    properties = {}
    appXML = ET.parse(path)
    root = appXML.getroot()[0].findall('property')
    for elem in root:
        properties[elem.get('name')] = elem.get('value')
    return properties


def getReliableUserPlatform():
    return str(platform.system())


def checkPathExist(path):
    if os.path.exists(path) == True:
        return 'true'
    else:
        return 'false'


def makeDirectoryUnderPath(path, dirname):
    full_path = os.path.join(path, dirname)
    if not os.path.exists(path):
        return 'false'
    elif not os.path.exists(full_path):
        os.mkdir(full_path)
    return 'true'


def getUserPath():
    return os.path.expanduser('~')


def removeFilesAndDir(dir_path, include_dir=False):
    isRemoved = 'false'
    if os.path.exists(dir_path) == True:
        try:
            for root, dirs, files in os.walk(dir_path):
                for file in files:
                    os.remove(os.path.join(root, file))
                for direc in dirs:
                    os.rmdir(os.path.join(root, direc))
            if include_dir == True:
                os.rmdir(dir_path)
            isRemoved = 'true'
        except Exception:
            pass
    return isRemoved


def helpersmain(data):
    if 'sub' in data:
        if(data['sub'] == 'properties'):
            return getAppProperties(data['path'])
        elif(data['sub'] == 'reliable-platform'):
            return getReliableUserPlatform()
        elif(data['sub'] == 'check-path'):
            return checkPathExist(data['path'])
        elif(data['sub'] == 'make-directory'):
            return makeDirectoryUnderPath(data['path'], data['dirname'])
        elif(data['sub'] == 'user-path'):
            return getUserPath()
        elif(data['sub'] == 'remove-files-from-dir'):
            does_inc_dir = True if data['include_dir'] == 'true' else False
            return removeFilesAndDir(data['path'], does_inc_dir)
        else:
            return {}
    else:
        raise Exception('PyCore: Helpers need sub key with valid data')
