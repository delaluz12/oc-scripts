import config from '../../integration-users.config';
import * as helpers from '../../helpers';

async function run() {
    const creds = config.seb.staging.lifeFitness
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    console.log(`Getting all products ...`)
    const allProducts = await helpers.listAll(sdk.Products.List);
    console.log(`Fetched ${allProducts?.length} products`)
    const patch = { xp: { Note: "Please note a 6% Inflationary Commodity Surcharge will be added to all Life Fitness quotes." } }

    // stats
    let patchedProducts: string[] = [];
    let total = allProducts.length;
    let progress = 0;
    const errors = {};

    // update products
    await helpers.batchOperations(allProducts, async function singleOperation(product): Promise<any> {
        try {
            progress++;
            await sdk.Products.Patch(product.ID, patch)
            console.log(`Patched ${progress} of ${total} progress`);
        } catch (e) {
            const errorID = product.ID;
            if (e.isOrderCloudError) {
                errors[errorID] = {
                    Message: e.message,
                    Errors: e.errors,
                };
            } else {
                errors[errorID] = { Message: e.message };
            }
        }
    })
    // log and finish
    await helpers.log(errors, 'patch-product-message.json')
    await helpers.log(patchedProducts, 'patched-products.json')
    console.log('done')
}

run();