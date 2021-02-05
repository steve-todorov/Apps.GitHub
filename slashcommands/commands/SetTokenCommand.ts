import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../../AppsGithubApp';
import {sendNotification} from '../../lib/helpers/sendNotification';
import {AppPersistence} from '../../lib/persistence';

export class SetTokenCommand {

    public constructor(private readonly app: AppsGithubApp) {
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, accessToken] = context.getArguments();

        if (!accessToken) {
            await sendNotification('Usage: `/github set-token ACCESS_TOKEN`', read, modify, context.getSender(), context.getRoom());
            return;
        }

        const persistence = new AppPersistence(persis, read.getPersistenceReader());

        await persistence.setUserAccessToken(accessToken, context.getSender());

        await sendNotification('Successfully stored your key', read, modify, context.getSender(), context.getRoom());
    }
}
