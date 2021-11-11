import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { ContentManagementClient } from '@ordercloud/cms-sdk'
import { Product } from 'ordercloud-javascript-sdk';
import { PatchData } from '../../helpers/patch-headstart-products';
import { makeApiCall } from '../../helpers';

async function run() {

    //1. first get all products
    const creds = config.seb.test.seller
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const allProducts = await helpers.listAll(sdk.Products.List);

    const auth = await sdk.Auth.ClientCredentials(
        creds.clientSecret,
        creds.clientID,
        ['FullAccess']
    )
    
    async function getPatch(product: Product<any>): Promise<PatchData> {

        if(product.ID === 'test123') {
            console.log(product)
        }
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
        const imageArray = imageUrls.map(url => {
            console.log(url.data)
            const parts = url.data.split("/")
            const name = parts[parts.length-1]
            return {
                Url: url.data,
                Tags: assets.Items.find(asset => asset.Url.includes(name))?.Tags
            }
        })
        const patchObj = {
            xp: {
                Images: imageArray
            }
        }
        if(product.ID === 'test123') {
            console.log(patchObj)
            console.log("")
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
}

run()