import {PullRequestEvent} from '@octokit/webhooks-definitions/schema';
import {BaseEventHandler} from './BaseEventHandler';

export class PullRequestEventHandler extends BaseEventHandler {
    protected getChatText(payload: PullRequestEvent): string {
        const sender = this.getGithubSenderText(payload);

        const commits = payload.pull_request.commits;
        const changedFiles = payload.pull_request.changed_files;
        const prNumber = payload.number;
        const repoUrl = `[${payload.repository.full_name}#${prNumber}](${payload.repository.html_url})`;

        const actionType = payload.action ? payload.action : 'pushed';

        if (actionType === 'synchronize') {
            return `${sender} has rebased ${repoUrl}`;
        } else if (actionType === 'review_requested') {
            return `${sender} requested review for ${repoUrl}`;
        }

        return `${sender} has pushed ${commits} commits changing ${changedFiles} files to ${repoUrl}.`;
    }

}
