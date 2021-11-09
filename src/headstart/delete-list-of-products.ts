import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { httpDelete } from '../../helpers';

async function run() {
    const creds = config.seb.staging.precor;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    console.log("getting products...")
    const products = []
    console.log("Got all products")

    const total = products.length;
    let progress = 1;
    const errors = {};

    console.log(`Deleting ${total} products.`)

    await helpers.batchOperations(products, async function singleOperation(
        id: string
    ): Promise<any> {
        try {
            const token = sdk.Tokens.GetAccessToken()
            await httpDelete(`products/${id}`, token)
            await sdk.PriceSchedules.Delete(id)
            console.log(`Deleted ${progress} out of ${total}`);
            progress++;
        } catch (e) {
            console.log("error")
            errors[id!] = e;
        }
    })
    await helpers.log(errors)
    helpers.log(errors, 'SEB-patch-errors');
    console.log("done")
}

run()