# Annovision (/ˌinəˈvāSH(ə)n/)

<img src="https://github.com/officialrobert/Annovision/blob/master/docs/logo.png" width="205" height="140"/>

An open-source desktop application for annotating/labelling data for vision AI. This tool includes **project management** and primarily supports annotation for **Classification**, **Segmentation** and **Object-detection** tasks. The current repository sits all required source-code to enable the tool up and running.

> **In progress**

<img src="https://github.com/officialrobert/Annovision/blob/master/docs/img/wip.png" width="640" height="360"/>

## Our platform

As data becomes critical for training and creating SOTA results in any vision AI tasks, this project seeks to provide a free tool that can enable researchers and developers to do so. This software offers not only the minimal yet advanced data labelling tool, it also grant users the ability to create and manage projects may it be for personal or commercial use.

This software haven't been tested on other distributed OS, except for `Windows 10` or newer. Take note that this application and source-code **doesn't embed any sort of analytics** that collects sensitive data, and will always stay that way. No limits, all free software.

## Running from source

Clone this repository and install needed modules as provided under package.json. Using `yarn` package manager is highly recommended.
After cloning repository extract embeddable python binaries inside **/pycorewin**, get the tested binaries via this [**link**](https://drive.google.com/file/d/1qY0X96uDVDdLVW86__BdJ1483WhD3MD4/view?usp=sharing)

## Documentation

- <a href="./docs/MECHANICS.md"><code><b>Mechanics and flow</b></code></a>
- <a href="./docs/PROJECT.md"><code><b>Project Management</b></code></a>
- <a href="./docs/CLASSIFICATION.md"><code><b>Classification task</b></code></a>
- <a href="./docs/PLANS.md"><code><b>Objective and features</b></code></a>

## Collaboration and contributing

This project is at its early-stage, shoot me an e-mail at `officialrobert.espina9627@gmail.com`.
If you like or love this initiative, please don't forget to give it a star, alright.

## Stack credits

- **ElectronJS** - For web-based UI
- **Embeddable python** - For core functionality
- **ReactJS** - Web UI framework
- **SQLite** - For low latency and overhead in-app data manipulation
- **Mousetrap** - For window hotkey bindings

## Citation

```
@MISC{Annovision,
author = {Robert Espina},
title = {{Annovision}},
howpublished = "\url{https://github.com/officialrobert/Annovision}",
year = {2020}}
```

## License

All for educational purposes. All free. Read more of [**Apache 2.0**](https://github.com/officialrobert/Annovision/blob/master/LICENSE).
