export enum Status {
  success = '0',
  fail = '1',
  building = '2',
}

export type BuildId = string;
export type CommitHash = string;
export type Command = string;

export interface IWithRepositoryId {
  repositoryId: string;
}

export interface IWithCommitHash {
  commitHash: CommitHash;
}

export interface IWithCommand {
  command: Command;
}

export interface IWithBuildId {
  buildId: BuildId;
}

export interface IWithStatus {
  status: Status;
}

export interface IWithStdOut {
  stdOut: string;
}

export interface IBuildResponse extends
  IWithBuildId,
  IWithStatus
{}

export interface IBuildRequest extends
  IWithBuildId,
  IWithRepositoryId,
  IWithCommitHash,
  IWithCommand
{};

export interface IClientBuildResult extends
  IWithBuildId,
  IWithStatus,
  IWithCommitHash
{}

export interface IClientBuildResultDetails extends
  IWithBuildId,
  IWithStatus,
  IWithCommitHash,
  IWithCommand,
  IWithStdOut
{}



