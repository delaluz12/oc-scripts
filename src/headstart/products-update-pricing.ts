import config from '../../integration-users.config';
import * as helpers from '../../helpers';
interface IObject {
    ProductID: string;
    Price: number;
}
async function run() {
    const creds = config.seb.staging.precor;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    console.log("getting pricing update objects...")
    const objects = []
    console.log("Got all objects")

    const total = objects.length;
    let progress = 1;
    const errors = {};
    const priceSchedules = {}
    console.log(`Updating the price schedule on ${total} products.`)

    await helpers.batchOperations(objects, async function singleOperation(
        obj: IObject
    ): Promise<any> {
        try {
            const priceSchedule = await sdk.PriceSchedules.Get(obj.ProductID)
            const updatedPriceSchedule = await sdk.PriceSchedules.Patch(priceSchedule.ID, { PriceBreaks: [{ Price: obj.Price, Quantity: priceSchedule.PriceBreaks[0].Quantity }] })
            const product = await sdk.Products.Get(obj.ProductID)
            const patchedProduct = await sdk.Products.Patch(obj.ProductID, { xp: { Currency: "USD" } })
            priceSchedules[obj.ProductID] = {
                PriceSchedule: {
                    "OldPrice": priceSchedule.PriceBreaks[0].Price,
                    "NewPrice": updatedPriceSchedule.PriceBreaks[0].Price
                },
                Product: {
                    "OldCurrency": product.xp.Currency,
                    "NewCurrency": patchedProduct.xp.Currency
                }
            }
            console.log(`Updated ${progress} out of ${total}`);
            progress++;
        } catch (e) {
            console.log("error")
            errors[obj.ProductID!] = e;
        }
    })
    await helpers.log(priceSchedules, `SEB-price-schedules`)
    await helpers.log(errors)
    helpers.log(errors, 'SEB-patch-errors');
    console.log("done")
}

run()