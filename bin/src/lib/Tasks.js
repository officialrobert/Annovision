const {
  CLASSIFICATION_TASK,
  REGION_TASK,
  SEGMENTATION_TASK,
} = require('../constants/App');

class Tasks {
  getFormat = (task, project, file) => {
    let format = {};
    /** commons */
    format.file = file.name;
    format.path = file.path;
    format.projectId = file.projectId;
    format.projectName = project;
    /** end of commons */

    if (task === CLASSIFICATION_TASK.key) {
      format.assigned = [];
    } else if (task === REGION_TASK.key) {
      // @todo
    } else if (task === SEGMENTATION_TASK.key) {
      // @todo
    }

    return format;
  };
}

export default new Tasks();
