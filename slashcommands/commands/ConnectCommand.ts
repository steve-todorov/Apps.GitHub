import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../../AppsGithubApp';
import {getWebhookUrl} from '../../lib/helpers/getWebhookUrl';
import {sendNotification} from '../../lib/helpers/sendNotification';
import {AppPersistence} from '../../lib/persistence';
import {getRepoName, GithubSDK} from '../../lib/sdk';

export class ConnectCommand {

    public constructor(private readonly app: AppsGithubApp) {
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, repoUrl] = context.getArguments();

        if (!repoUrl) {
            await sendNotification('Usage: `/github connect REPO_URL`', read, modify, context.getSender(), context.getRoom());
            return;
        }

        const repoName = getRepoName(repoUrl);

        if (!repoName) {
            await sendNotification('Invalid GitHub repo address', read, modify, context.getSender(), context.getRoom());
            return;
        }

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

        const sdk = new GithubSDK(http, accessToken);

        try {
            await sdk.createWebhook(repoName, await getWebhookUrl(this.app));
        } catch (err) {
            console.error(err);
            await sendNotification('Error connecting to the repo', read, modify, context.getSender(), context.getRoom());
            return;
        }

        await persistence.connectRepoToRoom(repoName, context.getRoom());

        await sendNotification('Successfully connected repo', read, modify, context.getSender(), context.getRoom());
    }
}
