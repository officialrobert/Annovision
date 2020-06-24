export default {
  viewFile: async (Mixer, value) => {
    Mixer.setState(
      {
        files: { ...Mixer.state.files, active: value },
      },
      () => {
        if (value.type === 'image') {
          Mixer.paintActiveImage();
        }
      }
    );
  },

  resolution: async (Mixer, value) => {
    Mixer.setState(
      {
        resolution: value,
      },
      () => {
        Mixer.handleWindowResize();
      }
    );
  },
};
