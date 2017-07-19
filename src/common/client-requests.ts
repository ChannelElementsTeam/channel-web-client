
import { BowerInstallResult } from "../bower-helper";

export interface ComponentRequest {
  package: string;  // appropriate to be passed to bower install <package>
}

export interface ComponentDescriptor {
  composerTag: string;
  viewerTag: string;
}

export interface ComponentResponse {
  source: string;
  importHref: string;
  package: BowerInstallResult;
  channelComponent: ComponentDescriptor;
}
