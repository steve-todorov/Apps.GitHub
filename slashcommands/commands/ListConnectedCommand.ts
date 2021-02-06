import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../../AppsGithubApp';
import {sendNotification} from '../../lib/helpers/sendNotification';
import {AppPersistence} from '../../lib/persistence';

export class ListConnectedCommand {

    public constructor(private readonly app: AppsGithubApp) {
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const persistence = new AppPersistence(persis, read.getPersistenceReader());

        const list = await persistence.connectedReposToRoom(context.getRoom());

        this.app.getLogger().debug(list);

        let message = 'Repositories assigned to this channel are:\n\n';

        if (list !== null && list.length > 0) {
            list.forEach((metadata: any) => {
                message += `- ${metadata.repoName}`;
            });
        } else {
            message += 'None found!';
        }

        await sendNotification(message, read, modify, context.getSender(), context.getRoom());
    }
}
