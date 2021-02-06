import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {ISlashCommand, SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../AppsGithubApp';
import {sendNotification} from '../lib/helpers/sendNotification';
import {ConnectCommand} from './commands/ConnectCommand';
import {DisconnectCommand} from './commands/DisconnectCommand';
import {ListConnectedCommand} from './commands/ListConnectedCommand';
import {PingCommand} from './commands/PingCommand';
import {SetTokenCommand} from './commands/SetTokenCommand';

enum Command {
    Connect    = 'connect',
    Disconnect = 'disconnect',
    List       = 'list',
    SetToken   = 'set-token',
    Ping       = 'ping',
}

enum CommandDesc {
    Connect    = '<REPO_URL>[,<REPO_URL>...] - Connects the repositories to this channel and creates a webhook (if the token allows this)',
    Disconnect = '<REPO_URL>[,<REPO_URL>...] - Disconnects the repositories from this channel (existing hooks must be deleted manually)',
    List       = ' - Lists all repositories connected to this channel.',
    SetToken   = '<GH_TOKEN> - Saves a token to be used for creating hooks and making GitHub API calls.',
    // https://docs.github.com/en/rest/reference/repos#test-the-push-repository-webhook
    Ping       = ' - Sends a test push event.',
}

export class GithubSlashCommand implements ISlashCommand {
    public command = 'github';
    public i18nParamsExample = 'slashcommand_params';
    public i18nDescription = 'slashcommand_description';
    public providesPreview = false;
    public permission = 'manage-apps';

    public constructor(private readonly app: AppsGithubApp) {
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command] = context.getArguments();

        switch (command) {
            case Command.Connect:
                await new ConnectCommand(this.app).executor(context, read, modify, http, persis);
                break;

            case Command.Disconnect:
                await new DisconnectCommand(this.app).executor(context, read, modify, http, persis);
                break;

            case Command.List:
                await new ListConnectedCommand(this.app).executor(context, read, modify, http, persis);
                break;

            case Command.SetToken:
                await new SetTokenCommand(this.app).executor(context, read, modify, http, persis);
                break;

            case Command.Ping:
                await new PingCommand(this.app).executor(context, read, modify, http, persis);
                break;

            case 'help':
            default:
                let message = `Available commands:  \n`;
                for (const item of Object.keys(Command)) {
                    const desc = Object.keys(CommandDesc).includes(item) ? CommandDesc[item] : '';
                    message += ` * ${Command[item]} ${desc}\n`;
                }
                await sendNotification(message, read, modify, context.getSender(), context.getRoom());
                break;
        }
    }

}
