import sys
import json

# custom imports below
from core import exec


def main():
    try:
        args = sys.argv[1]
        argslist = args.split()
        if (argslist[0] == '--params'):
            params = json.loads(
                str(args)[len('--params'):])
            try:
                res = exec(params['pytask'], params)
                print(json.dumps({'err': 'false', 'data': res}), end='')
            except Exception as e:
                print(json.dumps({'err': 'true', 'data': str(e)}), end='')

        else:
            print(json.dumps({'err': 'true'}), end='')
    except Exception as e:
        print(json.dumps({'err': 'true', 'data': str(e)}), end='')


if __name__ == '__main__':
    main()
