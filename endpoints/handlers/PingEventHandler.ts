import {PingEvent} from '@octokit/webhooks-definitions/schema';
import * as Url from 'url';
import {BaseApiHost, BaseHost} from '../../lib/sdk';
import {BaseEventHandler} from './BaseEventHandler';

export class PingEventHandler extends BaseEventHandler {
    protected getChatText(payload: PingEvent): string {
        let repoUrl = payload.hook.url;

        if (payload.repository !== undefined) {
            repoUrl = payload.repository.url;
        }

        repoUrl = repoUrl.replace(BaseApiHost, BaseHost)
                         .replace(/\/hooks\/[0-9]+$/g, '');

        this.app.getLogger().debug(repoUrl);

        const url = new Url.URL(repoUrl);

        let repoPath: any = url.pathname.split('/', 3);
        repoPath.shift();

        this.app.getLogger().debug(repoPath);

        repoPath = repoPath.join('/');

        return `Received ping from [${repoPath}](${repoUrl})`;
    }
}
