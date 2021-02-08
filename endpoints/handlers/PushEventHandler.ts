import {PushEvent} from '@octokit/webhooks-definitions/schema';
import {BaseHost} from '../../lib/sdk';
import {BaseEventHandler} from './BaseEventHandler';

export class PushEventHandler extends BaseEventHandler {
    protected getChatText(payload: PushEvent): string {

        const sender = this.getGithubSender(payload);

        const isDeleted = payload.deleted;

        let commitMessage: string | null = null;
        let commitDetails: string | null = null;
        let commits = '';

        if (!isDeleted && payload.head_commit) {
            commitMessage = payload.head_commit.message;
            commitMessage = 'Commit: ' + commitMessage;
            commitMessage += ' \n';

            commitDetails = `${payload.head_commit.added.length} new, `;
            commitDetails += `${payload.head_commit.removed.length} removed and `;
            commitDetails += `${payload.head_commit.modified.length} modified files`;

            commits = `Changes: ${commitDetails} \n`;
        }

        if (isDeleted) {
            commitMessage = 'Branch was deleted \n';
        }

        let author = '';
        if (sender != null) {
            author = `Author: [${sender.login}](${BaseHost}${sender.login})\n`;
        }

        const commitUrl = `${payload.repository.html_url}/commits/${payload.after}`;
        const repoUrl = `[${payload.repository.full_name}/${payload.ref}](${commitUrl})`;
        const compareUrl = `[Click here for diff](${payload.compare})`;

        return `Repository: ${repoUrl} \n${commitMessage} ${commits} ${author} ${compareUrl}`;
    }

}
