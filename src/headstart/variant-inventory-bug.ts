import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Product, User, Variant } from 'ordercloud-javascript-sdk';

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
    const rows = await helpers.csvToJson(
        'SEBProducts.csv'
    ) as Row[];
    const total = rows.length;
    let progress = 0;
    const errors = {};

    await helpers.batchOperations(rows, async function singleOperation(
        row: Row
    ): Promise<any> {
        let variantID = '';
        try {
            progress++;
            const variants = await helpers.listAll<Variant>(sdk.Products.ListVariants, row.ProductID)
            const requests = variants.filter(v => v.Inventory == null).map(v => {
                v.Inventory = {
                    QuantityAvailable: 0
                }
                return sdk.Products.SaveVariant(row.ProductID, v.ID!, v)
            })
            await Promise.all(requests);

            console.log(`${progress} of ${total} progress`);
        } catch (e) {
            const errorID = `${row.ProductID}_${variantID}`
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
    await helpers.log(errors, "variant-ingentory-bug.json")
    console.log("done")
}

run();