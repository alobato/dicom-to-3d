import {Request, Response} from 'express';
import {app} from './expressApp';
import {
  IBody,
  IParams,
  IWithCommand,
  IWithCommitHash,
  IWithRepositoryId,
  IWithUrl,
} from './types';
import {
  IWithStdOut,
  IWithBuildId,
  IWithStatus,
  IBuildResponse, Status, IBuildRequest,
} from './apiTypes';
import {arrayFromOut, execCommandWithRes} from './utils';
import {PORT} from './config';
import {DB_FULL_PATH} from "./config";

const {
  PATH_TO_REPOS,
  MESSAGE,
  RESPONSE,
} = require('./config');
const {createMessageObjectString} = require('./configUtils');
const DataStore = require('nedb');

const axios = require(`axios`);

const repositoryId = 'server-info';
const AGENT_PORT = 3022;


console.info('Server starting...')

const db = new DataStore({
  filename: DB_FULL_PATH,
  autoload: true,
});

const sendBuildRequestToAgent = ({buildId, repositoryId, commitHash, command}: IBuildRequest, type = `get`, body = {}) => {
  const host = `http://localhost:${AGENT_PORT}`;
  const url = 'build';
  const _url = `${host}/${url}/${buildId}/${repositoryId}/${commitHash}/${command}`;
  console.info(`sendBuildRequestToAgent: ${_url}`);
  return axios[type](_url, body)
    .then((response) => {
      console.info(type, _url);
      console.info('Agent is alive');
      console.info(response.data);
    })
    .catch((error) => {
      console.error(type, _url);
      console.error('Agent not response');
      console.error(error.response.data);
    });
};

// собирает и уведомляет о результатах сборки
app.get(
  '/build/:buildId/:repositoryId/:commitHash/:command',
  (
    {
      params, params: {commitHash, command},
    }: IParams<IWithRepositoryId & IWithCommitHash & IWithCommand>,
    res: Response
  ) => {
    console.info('build: ', JSON.stringify(params));

    db.insert(
      {commitHash, command},
      (err, newDoc) => {
        sendBuildRequestToAgent({
          buildId: newDoc._id,
          repositoryId,
          commitHash,
          command
        })
      }
    );
  }
);

// сохранить результаты сборки.
// В параметрах: id сборки, статус, stdout и stderr процесса.
app.get(
  '/notify_build_result/:buildId/:status/:stdOut',
  (
    {
      params: build,
    }: IParams<IBuildResponse>,
    res: Response
  ) => {
    // send build to user

    const {buildId, status, stdOut} = build;

    console.info('notify_build_result', JSON.stringify(build))
    db.update({_id: buildId}, {$set: {status, stdOut}});
    res.json({buildId, isAlive: true});
  }
);

// отдать результаты сборки.
app.get(
  '/get_build_results/',
  (
    req: Request,
    res: Response
  ) => {
    db.find({}).exec((err, docs) => {
      res.json(JSON.stringify(docs));
    });
  }
);

// DELETE /api/repos/:repositoryId
// Безвозвратно удаляет репозиторий
app.delete(
  '/api/repos/:repositoryId',
  ({params: {repositoryId}}: IParams<IWithRepositoryId>, res: Response) =>
    execCommandWithRes(
      `rm -rf ${PATH_TO_REPOS}/${repositoryId} &&
            echo '${createMessageObjectString(MESSAGE.REPOSITORY_DELETED)}'`,
      res,
      (x) => JSON.parse(x)
    )
);

// POST /api/repos/:repositoryId + { url: ‘repo-url’ }
// Добавляет репозиторий в список, скачивает его по переданной в теле запроса ссылке и добавляет в папку со всеми репозиториями c названием :repositoryId.
app.post(
  '/api/repos/:repositoryId',
  (
    {
      params: {repositoryId},
      body: {url},
    }: IParams<IWithRepositoryId> & IBody<IWithUrl>,
    res: Response
  ) => {
    console.log(repositoryId, url);
    execCommandWithRes(
      `cd ${PATH_TO_REPOS} &&
              git clone ${url.replace(
        /https?(:\/\/)/,
        'git$1'
      )} ${repositoryId} && 
              echo '${createMessageObjectString(MESSAGE.REPOSITORY_CLONED)}'`,
      res,
      (x) => JSON.parse(x),
      RESPONSE.NO_REPOSITORY(res)
    );
  }
);

// POST /api/repos + { url: ‘repo-url’ }
// Добавляет репозиторий в список, скачивает его по переданной в теле запроса ссылке и добавляет в папку со всеми репозиториями.
app.post('/api/repos', ({body: {url}}: IBody<IWithUrl>, res: Response) =>
  execCommandWithRes(
    `cd ${PATH_TO_REPOS} &&
                git clone ${url.replace(/https?(:\/\/)/, 'git$1')} && 
                echo '${createMessageObjectString(MESSAGE.REPOSITORY_CLONED)}'`,
    res,
    (x) => JSON.parse(x),
    RESPONSE.NO_REPOSITORY(res)
  )
);

console.info(`Server available on: https://localhost:${PORT}`);

app.listen(PORT);
