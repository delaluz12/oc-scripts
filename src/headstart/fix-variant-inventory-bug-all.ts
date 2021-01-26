import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Variant } from 'ordercloud-javascript-sdk';

//  For any products that have Variant.InventoryLevelTracking enabled
//  But Inventory is set to null, set Inventory to 0
//  Slack convo: https://four51.slack.com/archives/CE23HBZM3/p1608564471449300

interface Row {
    ProductID: string
    DefaultSupplierID: string
}

async function run() {
    const creds = config.prod["seb-admin"]
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const productsWithVariants = await helpers.listAll(sdk.Products.List, { filters: { VariantCount: '>0', 'Inventory.VariantLevelTracking': true } });

    // stats
    let fixedProductIDs: string[] = [];
    let total = productsWithVariants.length;
    let progress = 0;
    const errors = {};

    // update product variants
    await helpers.batchOperations(productsWithVariants, async function singleOperation(product): Promise<any> {
        let variantID = '';
        try {
            progress++;
            const variants = await helpers.listAll<Variant>(sdk.Products.ListVariants, product.ID)
            const requests = variants.filter(v => v.Inventory == null).map(v => {
                if (!fixedProductIDs.includes(product.ID)) {
                    fixedProductIDs.push(product.ID)
                }
                v.Inventory = {
                    QuantityAvailable: 0
                }
                return sdk.Products.SaveVariant(product.ID, v.ID!, v)
            })
            await Promise.all(requests);

            console.log(`${progress} of ${total} progress`);
        } catch (e) {
            const errorID = `${product.ID}_${variantID}`
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
    await helpers.log(errors, "fix-variant-inventory-bug-all.json")
    console.log("done")
}

run();