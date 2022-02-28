import {Package} from '@lerna/package';
declare module '@lerna/project' {
  export class Project {
    constructor(cwd: string);
    getPackages(): Promise<Package[]>;
  }

  export function getPackages(cwd: string): ReturnType<Project['getPackages']>;
}
