import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Product } from 'ordercloud-javascript-sdk';

async function runTorqueFitness() {
    const creds = config.prod.SEB.TorqueFitness;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const patch = { ShipFromAddressID: '036-01' };

    console.log("getting products...")
    const products = await helpers.listAll<Product>(sdk.Products.List);
    console.log("Got all products")

    const total = products.length;
    let progress = 0;
    const errors = {};

    console.log(`Patching ${total} products.`)

    await helpers.batchOperations(products, async function singleOperation(
        product: Product
    ): Promise<any> {
        try {
            await sdk.Products.Patch(product.ID!, patch);
            console.log(`Patched ${progress} out of ${total}`);
            progress++;
        } catch (e) {
            console.log("error")
            errors[product.ID!] = e;
        }
    })
    await helpers.log(errors)
    helpers.log(errors, 'SEB-patch-errors');
    console.log("done")
}

async function runLifeFitness() {
    const creds = config.prod.SEB.LifeFitness;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const patch = { ShipFromAddressID: '007-01' };

    console.log("getting products...")
    const products = await helpers.listAll<Product>(sdk.Products.List);
    console.log("Got all products")

    const total = products.length;
    let progress = 0;
    const errors = {};

    console.log(`Patching ${total} products.`)

    await helpers.batchOperations(products, async function singleOperation(
        product: Product
    ): Promise<any> {
        try {
            await sdk.Products.Patch(product.ID!, patch);
            console.log(`Patched ${progress} out of ${total}`);
            progress++;
        } catch (e) {
            console.log("error")
            errors[product.ID!] = e;
        }
    })
    await helpers.log(errors)
    helpers.log(errors, 'SEB-patch-errors');
    console.log("done")
}

// invoke the proper function here, then debug in the debug panel
runLifeFitness()