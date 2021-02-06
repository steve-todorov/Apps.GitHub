import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../../AppsGithubApp';
import {getRocketChatWebhookUrl} from '../../lib/helpers/getRocketChatWebhookUrl';
import {sendNotification} from '../../lib/helpers/sendNotification';
import {AppPersistence} from '../../lib/persistence';
import {getRepoName, GithubSDK} from '../../lib/sdk';

export class DisconnectCommand {

    public constructor(private readonly app: AppsGithubApp) {
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const accessToken = await persistence.getUserAccessToken(context.getSender());

        if (!accessToken) {
            await sendNotification(
                'You haven\'t configured your access key yet. Please run `/github set-token YOUR_ACCESS_TOKEN`',
                read,
                modify,
                context.getSender(),
                context.getRoom(),
            );
            return;
        }

        const repos = [...context.getArguments()];
        repos.shift(); // remove command from the arguments and leave only the repo urls.

        for (const repoUrl of repos) {
            await this.processRepo(repoUrl, context, read, modify, http, persis);
        }
    }

    private async processRepo(repoUrl: string, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence) {

        if (!repoUrl) {
            await sendNotification('Usage: `/github disconnect REPO_URL REPO_URL2 REPO_URL3`', read, modify, context.getSender(), context.getRoom());
            return;
        }

        const repoName = getRepoName(repoUrl);

        if (!repoName) {
            await sendNotification(`Invalid GitHub repo address: ${repoName}`, read, modify, context.getSender(), context.getRoom());
            return;
        }

        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const accessToken = await persistence.getUserAccessToken(context.getSender());

        const rocketChatHookUrl = await getRocketChatWebhookUrl(this.app);
        const sdk = new GithubSDK(this.app, http, accessToken);

        try {
            await sdk.deleteWebhook(repoName, rocketChatHookUrl);
        } catch (err) {
            this.app.getLogger().error(err);
            // 404 usually means the token doesn't have admin_hook (write:hook) access.
            if (err.statusCode !== 404) {
                const errorMsg = `Failed to disconnect ${repoUrl} from this channel!\nPlease check the logs for more info.`;
                await sendNotification(errorMsg, read, modify, context.getSender(), context.getRoom());
                return;
            } else {
                let errorMsg = `Unable to delete hook for repository ${repoUrl}! \nYou need to delete it yourself! \n\n`;
                errorMsg += `Disconnecting ${repoUrl} from ${context.getRoom().displayName}...`;
                await sendNotification(errorMsg, read, modify, context.getSender(), context.getRoom());
            }
        }

        await persistence.disconnectRepoToRoom(repoName, context.getRoom());
        const message = `Successfully disconnected from ${repoUrl}!`;
        await sendNotification(message, read, modify, context.getSender(), context.getRoom());
    }

}
