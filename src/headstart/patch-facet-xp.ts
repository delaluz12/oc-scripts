import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { ApiClient, Product, Products, User } from 'ordercloud-javascript-sdk';
import affectedIDs from './affectedIDs';

async function run() {
    const creds = config.prod.SEB.Admin;
    const adminSdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');
    const supplierSdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');

    type TokenDictionary = Record<string, string>;
    const supplierTokens: TokenDictionary = {};

    console.log("getting products...")
    let products: Product[] = [];
    try {
        for (const id of affectedIDs) {
            console.log(`Searching for ${id}`)
            let product;
            try {
                product = await Products.Get(id);
                console.log(`Found ${product.Name}!`)
            } catch (e) {
                console.log(e)
            }
            if (product?.ID) {
                products.push(product);
            }
        }
    } catch (e) {
        console.log(e)
    }
    console.log(`Found ${products.length} products`)
    console.log("Got all relevant products")
    
    const productsWithBadXp = products.filter(product => product.xp.Facets[""])
    console.log(`There are ${productsWithBadXp.length} products with bad xp still.`)

    const total = products.length;
    let progress = 0;
    const errors = {};

    async function authAsSupplier(supplierID: string): Promise<string> {
        var supplierToken = supplierTokens[supplierID];
        console.log(supplierToken);
        if (supplierToken) {
            return supplierToken;
        } else {
            var newUser = await createSupplierUser(supplierID);
            var token = await supplierSdk.Auth.Login(newUser.Username, newUser.Password!, creds.supplierClientID, ['ProductAdmin']);
            supplierTokens[supplierID] = token.access_token;
            return token.access_token;
        }
    }

    async function createSupplierUser(id: string): Promise<any> {
        var user: User = {
            ID: `dsteinmetz${id}`,
            Username: `dsteinmetz${id}`,
            FirstName: 'DJ',
            LastName: 'Steinmetz',
            Email: 'dsteinmetz@four51.com',
            Password: 'fails345',
            Active: true
        }
        var newUser = await adminSdk.SupplierUsers.Save(id, user.ID!, user);
        await adminSdk.SecurityProfiles.SaveAssignment({
            SupplierID: id,
            UserID: newUser.ID,
            SecurityProfileID: 'MPProductAdmin'
        });
        newUser.Password = user.Password!;
        return newUser;
    }


    console.log(`Patching ${total} products.`)

    await helpers.batchOperations(products, async function singleOperation(
        product: Product
    ): Promise<any> {
        try {
            if (product?.xp?.Facets[""] !== undefined) {
                const supplierToken = await authAsSupplier(product.OwnerID!);
                let correctedFacets = product?.xp?.Facets;
                const studioResaleFacets = correctedFacets[""];
                correctedFacets["studio_resale"] = studioResaleFacets;
                delete correctedFacets[""];
                // First patch xp.Facets to null, then replace with original values + fixed value
                const patch: Partial<Product> = {
                    xp: {
                        Facets: null
                    }
                }
                const correctPatch: Partial<Product> = {
                    xp: {
                        Facets: correctedFacets
                    }
                }
                // Patch xp.Facets = null
                await supplierSdk.Products.Patch(product.ID!, patch, { accessToken: supplierToken });
                // Patch xp.Facets back to the correct value, without the broken one
                await supplierSdk.Products.Patch(product.ID!, correctPatch, { accessToken: supplierToken })
            }
        } catch (e) {
            console.log("error")
            errors[product.ID!] = e;
        }
    })
    await helpers.log(errors)
    helpers.log(errors, 'headstart-patch-errors');
    console.log("done")
}
run();