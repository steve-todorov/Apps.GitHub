import {PullRequestEvent} from '@octokit/webhooks-definitions/schema';
import {BaseEventHandler} from './BaseEventHandler';

export class PullRequestEventHandler extends BaseEventHandler {
    protected getChatText(payload: PullRequestEvent): string {

        const targetBranch = payload.pull_request.base.ref;
        const sourceBranch = payload.pull_request.head.ref;

        const commits = payload.pull_request.commits;
        const changedFiles = payload.pull_request.changed_files;
        const prNumber = payload.number;
        const repoUrl = `[${payload.repository.full_name}#${prNumber}](${payload.repository.html_url}/pulls/${prNumber})`;

        const actionType = payload.action ? payload.action : 'pushed';
        const isMerged = payload.pull_request.merged;

        const sender = this.getGithubSenderText(payload);

        if (actionType === 'opened') {
            return `${sender} has opened ${repoUrl} targeting branch ${targetBranch}`;
        } else if (actionType === 'synchronize') {
            return `${sender} has rebased ${repoUrl}`;
        } else if (actionType === 'review_requested') {
            return `${sender} requested review for ${repoUrl}`;
        } else if (actionType === 'closed' && isMerged) {
            // tslint:disable-next-line:max-line-length
            return `${sender} has merged ${repoUrl} into [${payload.repository.full_name}#${targetBranch}](${payload.repository.html_url}/tree/${targetBranch})`;
        } else if (actionType === 'closed') {
            // tslint:disable-next-line:max-line-length
            return `${sender} has closed ${repoUrl} without merging.`;
        }

        return `${sender} has pushed ${commits} commits changing ${changedFiles} files in ${repoUrl}.`;
    }

}
