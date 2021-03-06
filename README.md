# Dicom to 3d
система конвертации dicom файлов в 3d изображения.

## Дэмо видео

Загрузка и распознание:
[![Загрузка и распознание](docs/dicom-to-3d-upload-preview.png)](https://yadi.sk/i/uLEea5gBJmR08w)

Просмотр списка 3д моделей:
[![Просмотр списка 3д моделей](docs/dicom-to-3d-list-preview.png)](https://yadi.sk/i/GCG3vuqKTqNOnA)


## Технологии

dicom to 3d converter:
- **python**
- **SimpleITK**
- **vtk**
- **numpu**

Часть frontend: 
- **typescript** отличается от JavaScript возможностью явного статического назначения типов, что призвано повысить скорость разработки, облегчить читаемость, рефакторинг и повторное использование кода, помочь осуществлять поиск ошибок на этапе разработки и компиляции. Особенно был полезен для написания интерфейсов, использующихся одновременно в двух разных местах: сервер и агент.
- **express** - быстрый, гибкий, минималистичный веб-фреймворк для приложений Node.js. Использовался для реализации API, общения между серверами, взаимодействия с базой.
- **websocket** - протокол связи поверх TCP-соединения, предназначенный для обмена сообщениями между браузером и веб-сервером в режиме реального времени. Использовался для отображения статуса билдов в реальном времени.
- **react** используется для разработки одностраничных приложений. Его цель — предоставить высокую скорость, простоту, масштабируемость и защиту от XSS атак. Испольозвася для написания интерфейса приложения.
- **creat react app** - отличный инструмент для быстрого старта React-приложений. Благодаря creat react app сэкономил много врмени на настройку окружения для React.
- **react bootstrap** - дизайн система. Сэкономила много времени на создание отзывчивого и красивого интейрфейса.
- **bem** - [за методологию](https://ru.bem.info/methodology/quick-start/)
- **multer** - express js либа для сохранения файлов на файловую систему, пришедших от пользователя
- **dwv** - DWV (DICOM Web Viewer) is an open source zero footprint medical image viewer library. It uses _only_ javascript and HTML5 technologies, meaning that it can be run on any platform that provides a modern browser (laptop, tablet, phone and even modern TVs). It can load local or remote data in DICOM format (the standard for medical imaging data such as MR, CT, Echo, Mammo, NM...) and  provides standard tools for its manipulation such as contrast, zoom, drag, possibility to draw regions on top of the image and imaging filters such as threshold and sharpening.

## Системные зависимости

- [python](https://www.python.org/)
- [nodejs](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/get-npm) (обычно устанавливается вместе с nodejs)
- [yarn](https://www.npmjs.com/package/yarn) (опционально, вместо yarn можно использовать во всех командах ниже npm)

## Установка проекта

- [windows](docs/windows-install.md)
- [ubuntu](docs/ubuntu-install.md)

## Dev запуск

#### Запуск server back

```npm
cd server/back &&
yarn &&
yarn run dev
```

#### Запуск server front

```npm
cd server/front &&
yarn &&
yarn run start
```

## Схема работы приложения

```
title images to 3d
react->node js: images
node js->file system: images
react->node js: make 3d
node js->python cli: make 3d
file system->python cli:images
python cli->python cli:make 3d
file system<-python cli:3d
node js<-file system:3d
react<-node js:3d
react->react:visualate 3d
```

[![build_sequince_uml_diagram](docs/build_sequince_uml_diagram.png?2)](https://sequencediagram.org/index.html#initialData=C4S2BsFMAIQWwIYHNIGdrAPbQMwBMAoAJ0gQGNgBaAPgDtM8YArVALlkRVQPsehZoAzEFGioAnqmCQ47eMjTFSFGr2ZtoiANYx8PBupoAHccAAWmWtDLgQ7bbsLDREqTOOmLVm3flcCJuaW1rYeQd62rA64TiIwrtJwADyUgV4hdnpq-KgpzvGSiax6JOTAKdksxYSlKtS1wKwAbiCoAK4I4AjSMUA)

[service for UML visualization](https://sequencediagram.org/)
