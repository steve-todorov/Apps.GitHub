import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {ISlashCommand, SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {AppsGithubApp} from '../AppsGithubApp';
import {ConnectCommand} from './commands/ConnectCommand';
import {SetTokenCommand} from './commands/SetTokenCommand';

enum Command {
    Connect  = 'connect',
    SetToken = 'set-token',
}

export class GithubSlashCommand implements ISlashCommand {
    public command = 'github';
    public i18nParamsExample = 'slashcommand_params';
    public i18nDescription = 'slashcommand_description';
    public providesPreview = false;

    public constructor(private readonly app: AppsGithubApp) {
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command] = context.getArguments();

        switch (command) {
            case Command.Connect:
                await new ConnectCommand(this.app).executor(context, read, modify, http, persis);
                break;

            case Command.SetToken:
                await new SetTokenCommand(this.app).executor(context, read, modify, http, persis);
                break;
        }
    }

}
