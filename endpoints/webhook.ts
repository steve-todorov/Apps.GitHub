import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse} from '@rocket.chat/apps-engine/definition/api';
import {AppPersistence} from '../lib/persistence';
import {BaseEventHandler} from './handlers/BaseEventHandler';
import {PingEventHandler} from './handlers/PingEventHandler';
import {PullRequestEventHandler} from './handlers/PullRequestEventHandler';
import {PushEventHandler} from './handlers/PushEventHandler';

export class WebhookEndpoint extends ApiEndpoint {
    public path = 'webhook';

    public async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {

        const eventType = this.getRequestEventType(request);

        if (eventType.match(/^(push|pull_request|ping)$/) === null) {
            return this.success({message: `Cannot handle event type ${eventType} yet, but that's ok.`});
        }

        const payload = this.extractRequestPayload(request);

        // some events might not have repository object in the payload.
        const repository = 'repository' in payload && typeof payload.repository === 'object' ? payload.repository : null;

        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const connectedRooms = await persistence.getConnectedRoomIds(repository.full_name);

        // No rooms assigned to this repository.
        this.app.getLogger().debug(connectedRooms);
        if (!connectedRooms) {
            return this.success();
        }

        const sender = await read.getUserReader().getById('cs-devops-bot');

        let eventHandler: BaseEventHandler;

        if (eventType === 'push') {
            eventHandler = new PushEventHandler(this.app, read, modify, http);
        } else if (eventType === 'pull_request') {
            eventHandler = new PullRequestEventHandler(this.app, read, modify, http);
        } else {
            // Assume ping event
            eventHandler = new PingEventHandler(this.app, read, modify, http);
        }

        // Send messages to connected rooms.
        for (const roomId of connectedRooms) {
            const room = await read.getRoomReader().getById(roomId);

            if (typeof room === 'undefined') {
                this.app.getLogger().error(`Could not find room by roomId: ${roomId}`);
                continue;
            }

            const message = await eventHandler.getChatMessage(payload, room, sender);

            await eventHandler.sendChatMessage(message);
        }

        return this.success();
    }

    private getRequestEventType(request: IApiRequest) {
        return request.headers['x-github-event'];
    }

    private extractRequestPayload(request: IApiRequest): any {
        let payload: any;

        // extract
        if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
            payload = JSON.parse(request.content.payload);
        } else {
            payload = request.content;
        }

        return payload;
    }

}
