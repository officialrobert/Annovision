'''
Wrapper for YAJL C library version 1.x.
'''

from ctypes import Structure, c_uint, c_ubyte, c_int, c_long, c_double, c_char, \
                   c_void_p, c_char_p, CFUNCTYPE, POINTER, byref, string_at, cast

from ijson import common, backends, utils
from ijson.compat import b2s


yajl = backends.find_yajl_ctypes(1)

yajl.yajl_alloc.restype = POINTER(c_char)
yajl.yajl_get_error.restype = POINTER(c_char)

C_EMPTY = CFUNCTYPE(c_int, c_void_p)
C_INT = CFUNCTYPE(c_int, c_void_p, c_int)
C_LONG = CFUNCTYPE(c_int, c_void_p, c_long)
C_DOUBLE = CFUNCTYPE(c_int, c_void_p, c_double)
C_STR = CFUNCTYPE(c_int, c_void_p, POINTER(c_ubyte), c_uint)


_callback_data = [
    # Mapping of JSON parser events to callback C types and value converters.
    # Used to define the Callbacks structure and actual callback functions
    # inside the parse function.
    ('null', C_EMPTY, lambda: None),
    ('boolean', C_INT, lambda v: bool(v)),
    # "integer" and "double" aren't actually yielded by yajl since "number"
    # takes precedence if defined
    ('integer', C_LONG, lambda *_args: None),
    ('double', C_DOUBLE, lambda *_args: None),
    ('number', C_STR, lambda v, l: common.number(b2s(string_at(v, l)))),
    ('string', C_STR, lambda v, l: string_at(v, l).decode('utf-8')),
    ('start_map', C_EMPTY, lambda: None),
    ('map_key', C_STR, lambda v, l: string_at(v, l).decode('utf-8')),
    ('end_map', C_EMPTY, lambda: None),
    ('start_array', C_EMPTY, lambda: None),
    ('end_array', C_EMPTY, lambda: None),
]

class Callbacks(Structure):
    _fields_ = [(name, type) for name, type, func in _callback_data]

class Config(Structure):
    _fields_ = [
        ("allowComments", c_uint),
        ("checkUTF8", c_uint)
    ]

YAJL_OK = 0
YAJL_CANCELLED = 1
YAJL_INSUFFICIENT_DATA = 2
YAJL_ERROR = 3


@utils.coroutine
def basic_parse_basecoro(target, allow_comments=False, check_utf8=False):
    '''
    Iterator yielding unprefixed events.

    Parameters:

    - f: a readable file-like object with JSON input
    - allow_comments: tells parser to allow comments in JSON input
    - check_utf8: if True, parser will cause an error if input is invalid utf-8
    - buf_size: a size of an input buffer
    '''
    send = target.send

    def callback(event, func_type, func):
        def c_callback(context, *args):
            send((event, func(*args)))
            return 1
        return func_type(c_callback)

    callbacks = Callbacks(*[callback(*data) for data in _callback_data])
    config = Config(allow_comments, check_utf8)
    handle = yajl.yajl_alloc(byref(callbacks), byref(config), None, None)
    try:
        while True:
            try:
                buffer = (yield)
            except GeneratorExit:
                buffer = b''
            if buffer:
                result = yajl.yajl_parse(handle, buffer, len(buffer))
            else:
                result = yajl.yajl_parse_complete(handle)
            if result == YAJL_ERROR:
                perror = yajl.yajl_get_error(handle, 1, buffer, len(buffer))
                error = cast(perror, c_char_p).value
                yajl.yajl_free_error(handle, perror)
                raise common.JSONError(error.decode('utf-8'))
            elif not buffer:
                if result == YAJL_INSUFFICIENT_DATA:
                    raise common.IncompleteJSONError('Incomplete JSON data')
                break
    finally:
        yajl.yajl_free(handle)


common.enrich_backend(globals())
