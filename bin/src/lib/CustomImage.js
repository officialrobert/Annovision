const PyCaller = require('./PyCaller').default;

class CustomImage {
  pathToBase64 = (path) => {
    return new Promise(async (resolve) => {
      let result = { isSuccess: false, err: false, data: null };
      const imgpy = await PyCaller.call(
        'send:image',
        {
          sub: 'get-base64',
          path,
        },
        false
      );

      if (imgpy.err) {
        result.err = true;
      } else if (!imgpy.data) {
        result.err = true;
      } else {
        result = { ...imgpy.data, err: false, isSuccess: true };
      }

      resolve(result);
    });
  };
}

export default new CustomImage();
