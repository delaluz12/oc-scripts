import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Product } from 'ordercloud-javascript-sdk';

async function runTestStandardProductsSupplier() {
    const creds = config.test.SEB.StandardProductsSupplier;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const patch = { xp: { Facets: { supplier: ['Standard Products']} } };

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

async function runPowerSystems() {
    const creds = config.prod.SEB.PowerSystems;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const patch = { xp: { Facets: { supplier: ['Power Systems']} } };

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

async function runImpactCanopyUSA() {
    const creds = config.prod.SEB.ImpactCanopyUSA;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const patch = { xp: { Facets: { supplier: ['Impact Canopy USA']} } };

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

async function runImpactCanopyCanada() {
    const creds = config.prod.SEB.ImpactCanopyCanada;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const patch = { xp: { Facets: { supplier: ['Impact Canopy Canada']} } };

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
// TODO: Make sure that you add 'ProductAdmin' to the roles array in the helpers.ocClient function
// in order to avoid authentication errors.  Suppliers do not have full access.
