import base64
from PIL import Image


def getDimension(data):
    isSuccess = 'false'
    if 'path' in data:
        try:
            with Image.open(data['path']) as img:
                width, height = img.size
                isSuccess = 'true'
        except Exception:
            isSuccess = 'false'
    return {'isSuccess': isSuccess, 'width': width, 'height': height}


def toBase64(data):
    isSuccess = 'false'
    imgbase64 = ''
    if 'path' in data:
        try:
            with open(data['path'], 'rb') as image_file:
                imgbase64 = base64.b64encode(image_file.read())
        except Exception:
            isSuccess = 'false'
    return {'isSuccess': isSuccess, 'img': str(imgbase64, 'utf-8')}


def imagemain(data):
    if 'sub' in data:
        if(data['sub'] == 'get-base64'):
            res = toBase64(data)
            return res
        elif (data['sub'] == 'get-dimensions'):
            res = getDimension(data)
            return res
    else:
        raise Exception('PyCore: Helpers need sub key with valid data')
