import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { ContentManagementClient } from '@ordercloud/cms-sdk'
import { Product, Supplier } from 'ordercloud-javascript-sdk';
import { PatchData } from '../../helpers/patch-headstart-products';
import { makeApiCall } from '../../helpers';

async function run() {
    //1. first get all suppliers
    const creds = config.seb.test.seller
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const allSuppliers = await helpers.listAll(sdk.Suppliers.List)
    console.log("suppliers")
    console.log(allSuppliers)

    const auth = await sdk.Auth.ClientCredentials(
        creds.clientSecret,
        creds.clientID,
        ['FullAccess']
    )

    async function updateSupplier(supplier: Supplier) {
        const assets = await ContentManagementClient.Assets.ListAssets('Suppliers', supplier.ID!, undefined, auth.access_token)
        //download and upload to new container
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
            console.log("patching supplier " + supplier.ID)
            await sdk.Suppliers.Patch(supplier.ID!, patchObj)
        }

    }

    await helpers.batchOperations(allSuppliers, updateSupplier, 10)
}

run()