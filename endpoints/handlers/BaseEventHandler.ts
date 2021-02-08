import {User as GithubUser, WebhookEvent} from '@octokit/webhooks-definitions/schema';
import {IHttp, IMessageBuilder, IModify, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {IApp} from '@rocket.chat/apps-engine/definition/IApp';
import {IRoom} from '@rocket.chat/apps-engine/definition/rooms';
import {IUser} from '@rocket.chat/apps-engine/definition/users';

export abstract class BaseEventHandler {

    constructor(protected app: IApp,
                protected read: IRead,
                protected modify: IModify,
                protected http: IHttp) {
    }

    public async getChatMessage(payload: WebhookEvent, room: IRoom, sender?: IUser): Promise<IMessageBuilder> {

        if (!sender) {
            sender = await this.getChatSender('@cs-devops-bot');
        }

        const githubSender = await this.getGithubSender(payload);

        return this.modify.getCreator().startMessage({
            room,
            sender,
            avatarUrl: githubSender ? githubSender.avatar_url : undefined,
            alias: githubSender ? githubSender.login : undefined,
            text: this.getChatText(payload),
        });
    }

    /**
     * @param message
     * @protected
     * @returns message id string.
     */
    public sendChatMessage(message: IMessageBuilder): Promise<string> {
        return this.modify.getCreator().finish(message);
    }

    protected async getChatSender(user): Promise<IUser> {
        return await this.read.getUserReader().getById(user);
    }

    protected getGithubSender(payload: WebhookEvent): GithubUser | null {
        if (payload != null) {
            // When merged, set the github user to be the person who's merging.
            if ('pull_request' in payload && typeof payload.pull_request === 'object' && 'merged_by' in payload.pull_request) {
                return payload.pull_request.merged_by as GithubUser;
            } else if ('sender' in payload && typeof payload.sender === 'object') {
                // fallback to sender
                return payload.sender as GithubUser;
            }
        }

        return null;
    }

    protected getGithubSenderText(payload: WebhookEvent): string | null {
        const sender = this.getGithubSender(payload);

        // some events don't have `sender` in their payload (i.e. GithubActions ones, etc)
        if (sender != null) {
            return `[${sender.login}](${sender.html_url})`;
        }

        return null;
    }

    protected abstract getChatText(payload: WebhookEvent): string;

}
