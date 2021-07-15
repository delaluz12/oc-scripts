import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { ContentManagementClient } from '@ordercloud/cms-sdk'
import { Product } from 'ordercloud-javascript-sdk';
import { PatchData } from '../../helpers/patch-headstart-products';
import { makeApiCall } from '../../helpers';

async function run() {

    //1. first get all products
    const creds = config.seb.test.seller
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const allProducts = await helpers.listAll(sdk.Products.List);

    const auth = await sdk.Auth.ClientCredentials(
        creds.clientSecret,
        creds.clientID,
        ['FullAccess']
    )
    
    async function getPatch(product: Product<any>): Promise<PatchData> {
        const assets = await ContentManagementClient.Assets.ListAssets("Products", product.ID!, undefined, auth.access_token)

        //download and upload to new container
        var uploadQueue: Promise<any>[] = []
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

        const imageArray = imageUrls.map(url => ({
            Url: url.data
        }))
        const patchObj = {
            xp: {
                Images: imageArray
            }
        }
        return {
            productID: product.ID!,
            patch: patchObj
        }
    }
    console.log("Getting Patch Objects...")
    const patchObjects = await helpers.batchOperations(allProducts, getPatch, 1)
    console.log("patchObjects: ")
    console.log(patchObjects)
    await helpers.PatchHeadstartProducts(patchObjects);
    console.log("done!")
    //await test()
}

run()