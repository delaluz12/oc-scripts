import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Product, User } from 'ordercloud-javascript-sdk';

//  steps to run
//  1. Create a copy of default admin client ID. generate a random client secret and select a default context user.
//      -this will be the context used by the adminSdk
//  2. Enter that client secret and client id of ^ that sdk along with client id of regular client you copied in integration-users.config.ts


async function run() {
    const creds = config.headstart.test.seller;
    const adminSdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const supplierSdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const patchBody = { xp: { PromotionEligible: true } };

    type TokenDictionary = Record<string, string>;
    const supplierTokens: TokenDictionary = {};

    console.log("getting products...")
    const products = await helpers.listAll<Product>(adminSdk.Products.List);
    console.log("Got all products")

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
            ID: `eking${id}`,
            Username: `eking${id}`,
            FirstName: 'Eric',
            LastName: 'King',
            Email: 'eking@four51.com',
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
            if (product.OwnerID) {
                const supplierToken = await authAsSupplier(product.OwnerID)
                await supplierSdk.Products.Patch(product.ID!, patchBody, { accessToken: supplierToken });
                console.log(`Patched ${progress} out of ${total}`);
                progress++;
            } else {
                await adminSdk.Products.Patch(product.ID!, patchBody);
                console.log(`Patched ${progress} out of ${total}`);
                progress++;
            }
        } catch (e) {
            try {
                await adminSdk.Products.Patch(product.ID!, patchBody); //try once more as admin user.
                console.log(`Patched ${progress} out of ${total}`);
                progress++;
            } catch (e) {
                console.log("error")
                errors[product.ID!] = e;
            }
        }
    })
    await helpers.log(errors)
    helpers.log(errors, 'headstart-patch-errors');
    console.log("done")
}

run();