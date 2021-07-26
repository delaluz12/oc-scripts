import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Supplier, User } from 'ordercloud-javascript-sdk';
import { ContentManagementClient } from '@ordercloud/cms-sdk';
import { batchOperations, listAll, makeApiCall } from '../../helpers';

async function run() {

    const creds = config.seb.test.seller
        const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');

        const auth = await sdk.Auth.ClientCredentials(
            creds.clientSecret,
            creds.clientID,
            ['FullAccess']
        )

        const adminUsers = await listAll(sdk.AdminUsers.List)

        await batchOperations(adminUsers, 
            async function singleOperation(user: User) {
            const assets = await ContentManagementClient.Assets.ListAssets(
                'AdminUsers',
                user.ID!,
                { filters: { Tags: ['ProfileImg'] } },
                auth.access_token
            )
            var uploadQueue: Promise<any>[] = []
            console.log(assets)
            assets?.Items?.forEach(asset => {
                const parts = asset.Url.split("/")
                const container = parts.find(part => part.startsWith("assets"))
                const blobName = parts[parts.length-1]
                uploadQueue.push(makeApiCall('support/transferblob', {
                        blobName: blobName,
                        sourceContainer: container
                    }
                ))
            })
            const imageUrls = await Promise.all(uploadQueue)
        if(imageUrls && imageUrls[0]) {
            const patchObj = {
                xp: {
                    Image: {
                        Url: imageUrls[0].data,
                        Tags: null
                    }
                }
            }
            console.log("patching user " + user.ID)
            await sdk.AdminUsers.Patch(user.ID!, patchObj)
        }
            
        })
}

run()