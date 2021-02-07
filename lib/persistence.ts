import {IPersistence, IPersistenceRead} from '@rocket.chat/apps-engine/definition/accessors';
import {RocketChatAssociationModel, RocketChatAssociationRecord} from '@rocket.chat/apps-engine/definition/metadata';
import {IRoom} from '@rocket.chat/apps-engine/definition/rooms';
import {IUser} from '@rocket.chat/apps-engine/definition/users';

export class AppPersistence {
    constructor(private readonly persistence: IPersistence, private readonly persistenceRead: IPersistenceRead) {
    }

    public async connectRepoToRoom(repoName: string, room: IRoom): Promise<void> {
        const roomAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id);
        const repoAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `repo:${repoName}`);

        await this.persistence.updateByAssociations([roomAssociation, repoAssociation], {
            repoName,
            room: room.id,
        }, true);
    }

    public async connectedReposToRoom(room: IRoom): Promise<Array<object>> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id);

        return await this.persistenceRead.readByAssociations([userAssociation]);
    }

    public async disconnectRepoToRoom(repoName: string, room: IRoom): Promise<void> {
        const roomAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id);
        const repoAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `repo:${repoName}`);
        await this.persistence.removeByAssociations([roomAssociation, repoAssociation]);
    }

    public async setUserAccessToken(accessToken: string, user: IUser): Promise<void> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'github-key');

        await this.persistence.updateByAssociations([userAssociation, typeAssociation], {accessToken}, true);
    }

    public async getConnectedRoomIds(repoName: string | undefined | null): Promise<Array<string> | undefined> {
        // some events don't have `repository` object in their JSON which would lead to this case. (i.e. PingEvent)
        if (repoName === undefined || repoName === null) {
            return undefined;
        }

        const repoAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `repo:${repoName}`);

        const result = await this.persistenceRead.readByAssociations([repoAssociation]);

        if (result != null && result.length > 0) {
            return result.map((r: any) => r.room);
        }

        return undefined;
    }

    public async getUserAccessToken(user: IUser): Promise<string | undefined> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'github-key');

        const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

        return result ? (result as any).accessToken : undefined;
    }
}
