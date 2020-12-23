import config from '../../integration-users.config';
import * as helpers from '../../helpers';

//  Sets variant xp for any variants that are missing it
//  Slack convo: https://four51.slack.com/archives/CPA9YHY9Y/p1608752170130400

async function run() {
    const creds = config.prod["seb-admin"]
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const productsWithVariants = await helpers.listAll(sdk.Products.List, { filters: { VariantCount: '>0' } });

    // stats
    let fixedProductIDs: string[] = [];
    let total = productsWithVariants.length;
    let progress = 0;
    const errors = {};

    // update product variants
    await helpers.batchOperations(productsWithVariants, async function singleOperation(product): Promise<any> {
        try {
            progress++;
            const variants = await sdk.Products.ListVariants(product.ID, { pageSize: 100 });
            const requests = variants.Items
                .filter(variant => variant.xp === null)
                .map(variant => {
                    fixedProductIDs.push(product.ID)
                    return sdk.Products.PatchVariant(product.ID, variant.ID, {
                        xp: {
                            SpecCombo: variant.Specs.map(s => s.OptionID).join('-'),
                            SpecValues: variant.Specs.map(s => ({ SpecName: s.Name, SpecOptionValue: s.Value, PriceMarkup: s.PriceMarkup }))
                        }
                    })
                })
            await Promise.all(requests);
            console.log(`${progress} of ${total} progress`);
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
    await helpers.log(errors, 'fix-null-variants.json')
    await helpers.log(fixedProductIDs, 'fixed-products.json')
    console.log('done')
}

run();