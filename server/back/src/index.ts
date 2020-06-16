import { config } from "dotenv"
config();
import {Request, Response} from 'express';

import {app} from './expressApp';
import {
  Agents,
  IBody,
  IParams,
  ITask,
} from './types';
import {
  IWithBuildId,
  IBuildResponse,
  Status,
  IBuildRequest,
  TYPE,
  ACTION,
  Message,
  IWithPort,
  IWithHost,
  IRepositoryInfo,
  STL_MODE_NAME,
} from './apiTypes';
import {DB_FULL_PATH, STATIC_DIR} from "./constants";
import * as WS from "ws";
import {SERVER_WS_PORT, SERVER_HTTP_PORT, REPOSITORY_URL} from "../config/env";
import * as multer from "multer";
import * as fs from 'fs'
import * as path from 'path'
import {exec} from "child_process";
import {PATH_TO_REPOS} from "../../../agent/src/constants";

const {
  MESSAGE,
} = require('./constants');
const {createMessageObjectString} = require('./configUtils');
const DataStore = require('nedb');
const axios = require(`axios`);

const repositoryId = 'server-info';

console.info('Server starting...');

const db = new DataStore({
  filename: DB_FULL_PATH,
  autoload: true,
});

const getInfoFromRepositoryUrl = (url: string): IRepositoryInfo => {
  console.log('getInfoFromGithubUrl:url', url);
  const urlArr = url.split('/');
  const repositoryName = urlArr.pop().replace(/\.git$/,'');
  const repositoryOwner = urlArr.pop();
  return {repositoryName, repositoryOwner};
}

const sendBuildRequestToAgent = ({buildId, repositoryUrl, commitHash, command}: IBuildRequest, agentUrl: string) => {
  const type = 'get';
  const body = {};
  const commandUrl = 'build';
  const _url = `${agentUrl}/${commandUrl}/${buildId}/${encodeURIComponent(repositoryUrl)}/${commitHash}/${command}`;

  console.info(`sendBuildRequestToAgent: ${_url}`);
  changeAgentStatusByUrl(agentUrl, false);

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

const sendBuildRequestToAgentIfNeed = (host: string, port: number) => {
  if (buildRequests.length === 0) {
    makeAgentFree(host, port);
  } else {
    sendBuildRequestToAgent(buildRequests.pop(), generateUrl(host, port)).catch(console.error);
  }
};

const sendMessage = (message: Message) => {
  wss.clients.forEach(function each(client) {
    let outJson = JSON.stringify(message);
    client.send(outJson);
    console.log('Send: ' + outJson);
  });
};

const agents: Agents = {};
const buildRequests: IBuildRequest[] = [];

const generateUrl = (host: string, port: number) => `${host}:${port}`;

const changeAgentStatusByUrl = (url: string, isFree: boolean) => {
  agents[url] = isFree;
  console.info(`Agent: ${url} {isFree: ${isFree}}`);
};

const changeAgentStatus = (host: string, port: number, isFree: boolean) => {
  changeAgentStatusByUrl(generateUrl(host, port), isFree);
};

const registryAgent = (host: string, port: number) => {
  console.info(`Registry new agent: ${generateUrl(host, port)}`);
  changeAgentStatus(host, port, false);
};

const makeAgentFree = (host: string, port: number) => {
  changeAgentStatus(host, port, true);
};

const getFreeAgent = () => {
  for (const agent in agents) {
    if (agents.hasOwnProperty(agent) && agents[agent]) {
      return agent;
    }
  }
  return false;
};

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/')
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname)
//   }
// })
// const upload = multer({storage})

const projectsFolder = path.join(STATIC_DIR, 'projects')

const upload = multer({dest: `${projectsFolder}/`})

const makeFolderIfNotExist = (path) => {
  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }
}

const moveFileToProject = (file: any, projectName: string) => {
  /** When using the "single"
   data come in "req.file" regardless of the attribute "name". **/
  var oldPath = file.path;

  let newDir = path.join(projectsFolder, projectName)
  makeFolderIfNotExist(newDir)
  newDir = path.join(newDir, 'imgs')
  makeFolderIfNotExist(newDir)

  /** The original name of the uploaded file
   stored in the variable "originalname". **/
  const newPath = path.join(newDir, file.originalname)

  return fs.promises.rename(oldPath, newPath)
}

const pathToDicom2StlPy = `${__dirname}/../dicom2stl/dicom2stl.py`

interface StlMode {
  name: STL_MODE_NAME,
  mode: string,
}

const stlModes = [
  {
    name: STL_MODE_NAME.BONE,
    mode: '-t bone'
  },
  {
    name: STL_MODE_NAME.SKIN,
    mode: '-t skin'
  },
  {
    name: STL_MODE_NAME.FAT,
    mode: '-t fat'
  },
  {
    name: STL_MODE_NAME.I128,
    mode: '-i 128'
  },
  {
    name: STL_MODE_NAME.SOFT,
    mode: '--enable rotation -t soft_tissue'
  },
]

const makeStlInProject = (projectName: string, stlMode: StlMode) => {
  const pathToProject = path.join(projectsFolder, projectName)
  const command = `python3 ${pathToDicom2StlPy} ${stlMode.mode} -o ${path.join(pathToProject, `${stlMode.name}.stl`)} ${path.join(pathToProject, 'imgs')}`
  console.log('projectName', projectName)
  console.log('command', command)
  return new Promise((resolve, reject) => {
    exec(
      command,
      {},
      (error: Error, stdOut: string) =>
        error
          ? reject(error)
          : resolve(stdOut)
    );
  });
}

app.post(
  '/upload/:projectName',
  upload.array('file'),
  async (
    {
      params,
      files,
    },
    response: Response,
  ) => {
    try {
      const {projectName} = params
      const filenames = files.map(({filename, originalname}) => ({
        filename,
        originalname,
      })) // or file.originalname);
      console.log('projectName', projectName)
      console.log('filenames', filenames)

      await Promise.all(files.map(file => moveFileToProject(file, projectName)))

      const stdOut = await makeStlInProject(projectName, stlModes.find((stlMode) => stlMode.name === STL_MODE_NAME.SOFT))
      response.json({stdOut});
    } catch (e) {
      response.json({error: e.message})
    }
  }
);

app.post(
  '/upload2/:projectName',
  upload.array('file'),
  async (
    {
      params,
      files,
    },
    response: Response,
  ) => {
    try {
      const {projectName} = params
      const filenames = files.map(({filename, originalname}) => ({
        filename,
        originalname,
      })) // or file.originalname);
      console.log('projectName', projectName)
      console.log('filenames', filenames)

      await Promise.all(files.map(file => moveFileToProject(file, projectName)))

      let stdOut = ''
      for (const stlMode of stlModes) {
        stdOut += await makeStlInProject(projectName, stlMode)
      }

      response.json({stdOut});
    } catch (e) {
      response.json({error: e.message});
    }

  }
);


//  WS

const WSS = WS.Server;
const wss = new WSS({port: SERVER_WS_PORT});

wss.on('connection', function (socket) {
  console.log('WS: Opened new connection');

  let json = createMessageObjectString(MESSAGE.CONNECTED);
  socket.send(json);
  console.log('Sent: ' + json);

  socket.on('close', function () {
    console.log('Closed Connection');
  });
});

app.listen(SERVER_HTTP_PORT);

console.info(`Server http API available on: http://localhost:${SERVER_HTTP_PORT}`);

console.info(`Server WS API available on: ws://localhost:${SERVER_WS_PORT}`);
