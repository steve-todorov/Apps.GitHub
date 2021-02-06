import {IHttp} from '@rocket.chat/apps-engine/definition/accessors';
import * as URL from 'url';
import {AppsGithubApp} from '../AppsGithubApp';

export const BaseHost = 'https://github.com/';
export const BaseApiHost = 'https://api.github.com/repos/';

export class GithubSDK {
    constructor(private readonly app: AppsGithubApp, private readonly http: IHttp, private readonly accessToken) {
    }

    public async createWebhook(repoName: string, webhookUrl: string) {
        const url = BaseApiHost + repoName + '/hooks';

        // delete existing hooks
        await this.deleteWebhook(repoName, webhookUrl);

        // register new hooks.
        return this.post(url, {
            active: true,
            events: ['push', 'pull_request', 'issue_comment', 'issues'],
            config: {
                url: webhookUrl,
                content_type: 'json',
            },
        });
    }

    public async deleteWebhook(repoName: string, webhookUrl: string) {
        const url = BaseApiHost + repoName + '/hooks';
        this.app.getLogger().info(`Searching for hook ${webhookUrl} in ${url}`);

        const hookUrls: any = await this.findGithubHookUrls(repoName, webhookUrl);

        if (hookUrls != null && hookUrls.length > 0) {
            for (const foundHookUrl of hookUrls) {
                this.app.getLogger().info(`Deleting github hook: ${foundHookUrl}`);
                await this.deleteHook(foundHookUrl);
            }
        } else {
            this.app.getLogger().info(`No hooks pointing to ${webhookUrl} were found`);
        }
    }

    public async testWebhook(repoName: string, hookId: string) {
        const url = BaseApiHost + repoName + '/hooks';

        const response = await this.http.post(url + '/' + hookId + '/tests', {
            headers: this.generateAuthHeaders(),
        });

        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        return JSON.parse(response.content || '{}');
    }

    public async findGithubHookUrls(repoName: string, webhookUrl: string): Promise<Array<string>> {
        const url = BaseApiHost + repoName + '/hooks';

        const response = await this.http.get(url, {headers: this.generateAuthHeaders()});

        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        const content: any = JSON.parse(response.content || '{}');

        // this.app.getLogger().debug('Received Github Hooks:');
        // this.app.getLogger().debug(content);

        const filtered: any = content.filter((h) => h.config.url === webhookUrl && h.active === true)
                                     .map((h) => h.url);

        this.app.getLogger().debug(`Filtering github hooks for: ${webhookUrl}`);
        this.app.getLogger().debug(filtered);

        // returns an array of hook urls which have the webhook url.
        return filtered;
    }

    private generateAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Rocket.Chat-Apps-Engine',
        };
    }

    private async post(url: string, data: any): Promise<any> {
        const response = await this.http.post(url.trim(), {
            headers: this.generateAuthHeaders(),
            data,
        });

        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        return JSON.parse(response.content || '{}');
    }

    private async deleteHook(url: string): Promise<any> {
        const response = await this.http.del(url.trim(), {headers: this.generateAuthHeaders()});

        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        return JSON.parse(response.content || '{}');
    }
}

export function getRepoName(repoUrl: string): string {
    if (!repoUrl.startsWith(BaseHost)) {
        // when `org/repo` - return as-is.
        if ((repoUrl.match(/\//g) || []).length === 1) {
            return repoUrl;
        }

        // otherwise return ''
        return '';
    }

    // get first two segments of the pathname (/org/repo) and remove first character
    return new URL.URL(repoUrl).pathname.split('/', 3).join('/').substring(1);
}
