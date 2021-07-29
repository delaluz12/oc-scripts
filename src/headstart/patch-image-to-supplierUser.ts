import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Supplier, User } from 'ordercloud-javascript-sdk';
import { ContentManagementClient } from '@ordercloud/cms-sdk';
import { batchOperations, makeApiCall } from '../../helpers';


async function run() {
        //1. first get all suppliers
        const creds = config.seb.test.seller
        const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');

        const auth = await sdk.Auth.ClientCredentials(
            creds.clientSecret,
            creds.clientID,
            ['FullAccess']
        )

        const allSuppliers = await helpers.listAll(sdk.Suppliers.List)
        await batchOperations(allSuppliers, updateSupplierUser, 1) //allSuppliers.map(supplier => updateSupplierUser(supplier))



        async function updateSupplierUser(supplier: Supplier) {
            console.log("Supplier: " + supplier.ID)
            const supplierUsers = await  helpers.listAll(sdk.SupplierUsers.List, supplier.ID)
            await batchOperations(supplierUsers, 
                async function singleOperation(user: User) {
                    const assets = await ContentManagementClient.Assets.ListAssetsOnChild(
                        'Suppliers', 
                        supplier.ID!, 
                        'SupplierUsers', 
                        user.ID!, 
                        { filters: { Tags: ['ProfileImg'] } },
                        auth.access_token)
                    const uploadQueue: Promise<any>[] = []
                    assets.Items.forEach(asset => {
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
                        console.log("patching supplier user: " + user.ID)
                        await sdk.SupplierUsers.Patch(supplier.ID!, user.ID!, patchObj);
                    }
                }, 1)
        }
}

run()