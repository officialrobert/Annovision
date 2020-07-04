import React, { Component, createRef } from 'react';
import styles from './RightPanel.scss';
import cx from 'classnames';
import i18n from 'src/locales';
import Button from 'src/components/button';
import Dropdown from 'src/components/dropdown';
import Logger from 'src/lib/Logger';
import { withProjectSettings } from 'src/project-manager/Context';
import { withModalSettings } from 'src/modal-manager/Context';
import { debounce, cloneObject } from 'src/helpers/util';
import AppLoader from 'src/components/app-loader';
import TextInput from 'src/components/text-input';
import {
  USER_CONFIG_FILES_DEFAULT,
  DEFAULT_REGION_INSPECT,
  DEFAULT_SEGMENTATION_INSPECT,
} from 'src/constants/App';
import ClearFiles from 'src/components/modals/clear-files';

const OUTPUT_MORE_RIGHT_PANEL = {
  open: { name: i18n('open_title'), key: 'open' },
};

const FILES_OPTS = {
  add: { name: i18n('add_files_title'), key: 'add' },
  remove: { name: i18n('remove_file_title'), key: 'remove' },
  clear: { name: i18n('clear_title'), key: 'clear' },
};

const DROP_FILES_CLASSNAME_RIGHT_PANEL = 'DROP_FILES_CLASSNAME_RIGHT_PANEL';
const DROP_OUTPUT_CLASSNAME_RIGHT_PANEL = 'DROP_OUTPUT_CLASSNAME_RIGHT_PANEL';

class RightPanel extends Component {
  wrap = null;

  state = {
    outputDir: 'X:\\Fake path\\',
    moreAllFiles: false,
    moreOutputDir: false,
    mounted: false,
    dirDims: {},
    gettingFiles: false,
    currentPage: USER_CONFIG_FILES_DEFAULT.currentPage, // for user input
    importingFilesPercent: 0,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });

    this.wrap = createRef();
    window.addEventListener('resize', this.handleRightPanelResize);
    window.addEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (evt) => {
    if (!evt) return;
    const elem = evt.target;

    if (
      this.state.moreAllFiles &&
      !elem.classList.contains(DROP_FILES_CLASSNAME_RIGHT_PANEL)
    ) {
      this.setState({
        moreAllFiles: false,
      });
    }

    if (
      this.state.moreOutputDir &&
      !elem.classList.contains(DROP_OUTPUT_CLASSNAME_RIGHT_PANEL)
    ) {
      this.setState({
        moreOutputDir: false,
      });
    }
  };

  handleRightPanelResize = debounce(() => {
    const { clientHeight } = this.wrap.current;
    const dirDims = {};

    if (clientHeight) {
      dirDims.height = `${Math.floor(clientHeight * 0.32)}px`;

      this.setState({
        dirDims,
      });
    }
  }, 300);

  toggleMore = (evt) => {
    if (!evt || !this.state.mounted) return;
    const elem = evt.target;

    if (elem.hasAttribute('data')) {
      try {
        const jsonData = JSON.parse(elem.getAttribute('data'));

        if (jsonData.state)
          this.setState({
            [jsonData.state]: !this.state[jsonData.state],
          });
      } catch (err) {
        Logger.error(err.message);
      }
    }
  };

  componentDidMount() {
    const { userConfig = null } = this.props;

    this.setState(
      {
        mounted: true,
        ...(userConfig &&
          userConfig.files && {
            currentPage: userConfig.files.currentPage,
          }),
      },
      this.mainOnMount
    );
  }

  mainOnMount = () => {
    if (this.wrap.current) {
      this.props.rightPanelOn(this.wrap.current);
      this.handleRightPanelResize();
    }
  };

  componentWillUnmount() {
    this.setState({
      mounted: false,
    });

    delete this.wrap;
    window.removeEventListener('resize', this.handleRightPanelResize);
    window.removeEventListener('click', this.handleOutsideClick);
  }

  onAllFilesOpts = (evt) => {
    if (!evt) return;

    const elem = evt.target;

    if (elem.hasAttribute('data')) {
      try {
        const optsJSON = JSON.parse(elem.getAttribute('data'));

        this.setState({ moreAllFiles: false });

        switch (optsJSON.key) {
          case FILES_OPTS['add'].key:
            this.onSelectFiles();
            return;
          case FILES_OPTS['remove'].key:
            this.removeAttempt();
            return;
          case FILES_OPTS['clear'].key:
            this.clearFilesAttempt();
            return;
          default:
            return;
        }
      } catch (err) {
        Logger.error(err.message);
      }
    }
  };

  confirmClearFiles = async () => {
    await this.props.clearAllFiles();
    await this.setStateAsync({
      currentPage: 1,
    });
    this.props.deactivateModal();
  };

  clearFilesAttempt = async () => {
    const { importingFiles, removingFiles } = this.props;
    const { mounted } = this.state;

    if (importingFiles || !mounted || removingFiles) return;

    this.props.setDOM(
      <ClearFiles
        close={this.props.deactivateModal}
        confirm={this.confirmClearFiles}
      />
    );
    this.props.activateModal();
  };

  removeAttempt = async () => {
    const { userConfig } = this.props;
    const { mounted } = this.state;
    const { files = null } = userConfig;

    if (!files || !files.active || !mounted) return;
    // const { active } = files;

    // remove active file
  };

  onOutputOpts = (evt) => {
    if (!evt) return;

    const elem = evt.target;

    if (elem.hasAttribute('data')) {
      try {
        const optsJSON = JSON.parse(elem.getAttribute('data'));

        this.setState({ moreOutputDir: false });

        switch (optsJSON.key) {
          case OUTPUT_MORE_RIGHT_PANEL['open'].key:
            this.props.showDirectory('output');
            break;
          case OUTPUT_MORE_RIGHT_PANEL['change'].key:
            break;
          default:
            return;
        }
      } catch (err) {
        Logger.error(err.message);
      }
    }
  };

  onSelectFiles = debounce(async () => {
    const res = await window.ipc.invoke('file:selectLocalImages');
    const { selectedProject } = this.props;
    let importingFilesPercent = 0;
    await this.setStateAsync({ gettingFiles: true, importingFilesPercent });

    if (res.length > 0 && selectedProject) {
      for (let index = 0; index < res.length; index++) {
        const cFile = res[index];
        importingFilesPercent = Math.floor(((index + 1) / res.length) * 100);
        const fetchFiles = !!(index === res.length - 1);

        await this.props.addFileForProject(
          {
            name: cFile.name,
            path: cFile.path,
            ext: cFile.ext,
          },
          fetchFiles
        );

        this.setState({
          importingFilesPercent,
        });
      }
    }

    Logger.log(
      `Project - ${selectedProject.name} number of files udpated - ${this.props.selectedProject.numFiles}`
    );
    await this.setStateAsync({ gettingFiles: false });
  }, 200);

  selectAFile = async (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      try {
        const { userConfig } = this.props;
        const dataJSON = JSON.parse(evt.target.getAttribute('data'));
        const files = cloneObject(userConfig.files);
        const inspect = cloneObject(this.props.inspect);
        inspect.region = { ...DEFAULT_REGION_INSPECT };
        inspect.segmentation = { ...DEFAULT_SEGMENTATION_INSPECT };

        if (
          files.active &&
          files.active.name === dataJSON.name &&
          files.active.idx === dataJSON.idx
        )
          return;

        files.active = dataJSON;
        await this.props.setGlobalState('inspect', inspect);
        await this.props.setUserConfig('files', files, 'setActiveFile');
      } catch (err) {
        Logger.error(`Selecting a file : ${err.message}`);
      }
    }
  };

  onPageInput = (evt) => {
    const { gettingFiles, mounted } = this.state;
    const { importingFiles } = this.props;

    if (!evt || !mounted || gettingFiles || importingFiles) return;

    this.setState(
      {
        currentPage: evt.target.value,
      },
      this.setPage
    );
  };

  setPage = debounce(async () => {
    const { selectedProject = null, userConfig } = this.props;
    const { currentPage, gettingFiles } = this.state;
    const files = cloneObject(userConfig.files);
    const maxPage = Math.ceil(
      Number(selectedProject.numFiles) / Number(files.filesPerPage)
    );

    if (gettingFiles) return;
    else if (!selectedProject) {
      await this.setStateAsync({
        currentPage: files.currentPage,
        gettingFiles: false,
      });
      return;
    }

    try {
      const inNum = Number(currentPage);
      if (Number.isNaN(inNum) || !inNum || maxPage <= 0)
        await this.setStateAsync({
          currentPage: files.currentPage,
        });
      else if (inNum > maxPage) {
        await this.setStateAsync({
          currentPage: maxPage,
        });
      }
    } catch (err) {
      await this.setStateAsync({
        currentPage: files.currentPage,
      });

      Logger.error(err.message);
    }

    if (String(files.currentPage) !== String(this.state.currentPage)) {
      files.currentPage = Math.floor(Number(this.state.currentPage));
      await this.props.importingProjectFiles(true);
      await this.props.setUserConfig('files', files);
      await this.props.fetchProjectFiles();
      await this.props.importingProjectFiles(false);
    }
  }, 100);

  movePage = async (mode = null) => {
    const { selectedProject = null, importingFiles, userConfig } = this.props;
    const { files } = userConfig;
    const { mounted, gettingFiles } = this.state;

    if (!mounted || !selectedProject || gettingFiles || importingFiles || !mode)
      return;

    const maxPage = Math.ceil(
      Number(selectedProject.numFiles) / Number(files.filesPerPage)
    );

    const newCurrentPage =
      Number(files.currentPage) +
      (mode === 'increase' ? 1 : mode === 'decrease' ? -1 : 0);
    if (newCurrentPage > maxPage || newCurrentPage < 1) return;

    this.setState(
      {
        currentPage: newCurrentPage,
      },
      this.setPage
    );
  };

  render() {
    const {
      moreAllFiles,
      moreOutputDir,
      dirDims = {},
      gettingFiles,
      currentPage,
      importingFilesPercent,
    } = this.state;
    const {
      dirs = {},
      importingFiles,
      projectFiles = [],
      userConfig,
      showRightPanel,
    } = this.props;
    const { files = null } = userConfig;

    return (
      <div
        ref={this.wrap}
        className={cx(
          {
            [styles.panelshow]: showRightPanel,
            [styles.panelhide]: !showRightPanel,
          },
          styles.rightpanel
        )}
      >
        <section className={styles.current}>
          <div className={cx(styles.center_vertical_row, styles.header)}>
            <p className={styles.title}>{i18n('all_files_title')}</p>
            <Dropdown
              areaClassName={DROP_FILES_CLASSNAME_RIGHT_PANEL}
              className={styles.drop}
              show={moreAllFiles}
              classNameExpand={styles.drop_files}
              data={Object.values(FILES_OPTS)}
              onClick={this.onAllFilesOpts}
            >
              <Button
                areaClassName={DROP_FILES_CLASSNAME_RIGHT_PANEL}
                onClick={this.toggleMore}
                className={styles.more}
                data={JSON.stringify({ state: 'moreAllFiles' })}
                disable={gettingFiles}
              >
                <p>{'...'}</p>
              </Button>
            </Dropdown>
          </div>
          <div
            style={dirDims}
            className={cx(styles.center_all_row, styles.filesdisplay)}
          >
            {
              <ul
                className={styles.center_horizontal_column}
                onClick={this.selectAFile}
              >
                {projectFiles.map((file, index) => {
                  let isSelected = false;

                  if (files.active) {
                    if (files.active.idx === file.idx) isSelected = true;
                  }

                  return (
                    <li
                      key={`${index}-${file.name}`}
                      className={cx(styles.center_vertical_row, {
                        [styles.selected]: isSelected,
                      })}
                    >
                      <p>{`[ID-${file.idx}] ${file.name}`}</p>
                      <span
                        data={JSON.stringify(file)}
                        className={styles.cover}
                      />
                    </li>
                  );
                })}
              </ul>
            }
            {(importingFiles || gettingFiles) && (
              <div className={cx(styles.center_all_column, styles.load)}>
                <div className={styles.spin}>
                  <AppLoader />
                </div>
                <p className={styles.msg}>{`${
                  gettingFiles
                    ? `${importingFilesPercent}%`
                    : i18n('project_importing_files')
                }`}</p>
              </div>
            )}
          </div>
          <div className={cx(styles.center_vertical_row, styles.pages)}>
            <p className={styles.title}>{i18n('page_title')}</p>
            <div className={cx(styles.center_vertical_row, styles.actions)}>
              <Button
                className={styles.decrease}
                onClick={() => this.movePage('decrease')}
              >
                <p className={styles.center_all_row}>{'-'}</p>
              </Button>
              <TextInput
                value={currentPage}
                className={styles.cpage}
                onChange={this.onPageInput}
              />
              <Button
                className={styles.increase}
                onClick={() => this.movePage('increase')}
              >
                <p className={styles.center_all_row}>{'+'}</p>
              </Button>
            </div>
          </div>
        </section>
        <section className={styles.output}>
          <div className={cx(styles.center_vertical_row, styles.header)}>
            <p className={styles.title}>{i18n('output_dir_title')}</p>
            <Dropdown
              areaClassName={DROP_OUTPUT_CLASSNAME_RIGHT_PANEL}
              className={styles.drop}
              show={moreOutputDir}
              classNameExpand={styles.drop_output}
              data={Object.values(OUTPUT_MORE_RIGHT_PANEL)}
              onClick={this.onOutputOpts}
            >
              <Button
                areaClassName={DROP_OUTPUT_CLASSNAME_RIGHT_PANEL}
                onClick={this.toggleMore}
                className={styles.more}
                data={JSON.stringify({ state: 'moreOutputDir' })}
              >
                <p>{'...'}</p>
              </Button>
            </Dropdown>
          </div>
          <p className={cx(styles.text_overflow_ellipsis, styles.dirtext)}>
            {(dirs && dirs.output) || ''}
          </p>
          <div style={dirDims} className={styles.dirdisplay}></div>
        </section>
      </div>
    );
  }
}

export default withProjectSettings(withModalSettings(RightPanel));
