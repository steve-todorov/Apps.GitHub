import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../../AppsGithubApp';
import {getRocketChatWebhookUrl} from '../../lib/helpers/getRocketChatWebhookUrl';
import {sendNotification} from '../../lib/helpers/sendNotification';
import {AppPersistence} from '../../lib/persistence';
import {BaseHost, getRepoName, GithubSDK} from '../../lib/sdk';

export class PingCommand {

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
        {
            if (repoUrl === undefined) {
                await sendNotification(
                    `To ping a hook you must provide a valid <REPO_URL>!`,
                    read, modify, context.getSender(), context.getRoom(),
                );
                return;
            }

            const persistence = new AppPersistence(persis, read.getPersistenceReader());
            const accessToken = await persistence.getUserAccessToken(context.getSender());

            const repoName = getRepoName(repoUrl);

            if (!repoName) {
                await sendNotification(`Invalid GitHub repo address: ${repoName}`, read, modify, context.getSender(), context.getRoom());
                return;
            }

            const rocketChatHookUrl = await getRocketChatWebhookUrl(this.app);
            const sdk = new GithubSDK(this.app, http, accessToken);

            const foundHooks = await sdk.findGithubHookUrls(repoName, rocketChatHookUrl);

            if (foundHooks === null || foundHooks.length < 1) {
                await sendNotification(
                    `No hooks found for ${repoUrl}`,
                    read, modify, context.getSender(), context.getRoom(),
                );
                return;
            }

            // gh does not allow for multiple hooks pointing to the same url so this should be safe.
            const hookId = foundHooks[0].replace(/.+\/([0-9]+)$/gi, '$1');

            await sendNotification(
                `Testing hook ${BaseHost}${repoUrl}/settings/hooks/${hookId} - a message should pop-up right about now.`,
                read, modify, context.getSender(), context.getRoom(),
            );

            try {
                await sdk.testWebhook(repoName, hookId);
                await sendNotification(`If no message was received by now you should check the logs.`, read, modify, context.getSender(), context.getRoom());
            } catch (err) {
                this.app.getLogger().error(err);
                await sendNotification(`Error testing hook ${hookId} for ${repoUrl}`, read, modify, context.getSender(), context.getRoom());
                return;
            }
        }
    }
}
