from .test import *
from .helpers import *
from .db import *
from .image import *


def exec(pytask, data=None):
    if pytask == 'test':
        res = testmain()
        return res
    elif pytask == 'helpers':
        res = helpersmain(data)
        return res
    elif pytask == 'database':
        res = dbmain(data)
        return res
    elif pytask == 'image':
        res = imagemain(data)
        return res
    else:
        return {}
