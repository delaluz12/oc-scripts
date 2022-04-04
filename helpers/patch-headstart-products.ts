import  config from '../integration-users.config';
import { ocClient, listAll, batchOperations, log } from '.';
import { Product, Supplier, Suppliers, User } from 'ordercloud-javascript-sdk';

// To Patch an SEB/Headstart product you must be authenticated as a suppleir user that owns that product
// this script automatically authenticates as the correct supplier before patching the product 
// then will delete all suppleir users that was created in the process

//  steps to run
//  1. Create a copy of default admin client ID. generate a random client secret and select a default context user.
//      -this will be the context used by the adminSdk
//  2. The supplierClientID should be the original default admin client id. We need this one to log in and get a token with
//  client credentials

export interface PatchData {
    productID: string
    patch: Partial<Product>
}

const supplierClientID = ''; // used for authenticating as supplier;

export async function PatchHeadstartProducts<InputType = any, ReturnType = any>(
    partialProducts: PatchData[],
    productsToPatch?: Product<any>[]
    ) {

    const creds = config?.seb?.test;
    if(!creds) {
        throw "credentials not set";
    }
    const adminSdk = await ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const supplierSdk = await ocClient(creds.clientID, creds.clientSecret, 'Staging');

    const password = makeRandom(10) + '123!'


    type TokenDictionary = Record<string, string>;
    const supplierTokens: TokenDictionary = {};

    let products: Product<any>[] = []
    if(!productsToPatch) {
        console.log("getting products...")
        products = await listAll<Product>(adminSdk.Products.List)
        console.log("Got all products")
    } else {
        products = productsToPatch
    }
    
    const total = products.length;
    let progress = 0;
    const errors = {};

    async function authAsSupplier(supplierID: string): Promise<string> {
        if (supplierTokens && supplierTokens[supplierID]) {
            return supplierTokens[supplierID];
        } else {
            try {
                var newUser = await createSupplierUser(supplierID);
                try {
                    var token = await supplierSdk.Auth.Login(newUser.Username, newUser.Password!, supplierClientID, ['ProductAdmin']);
                } catch(error) {
                    console.log(error)
                    console.log(newUser)
                    throw error
                }
                supplierTokens[supplierID] = token.access_token;
                return token.access_token;
                
            } catch (error) {
                console.log(error)
                throw error
            }
            
        }
    }

    function makeRandom(length) {
        var result = '';
        var upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            if(i===0) {
                result +=upperCaseChars.charAt(Math.floor(Math.random() * 
                charactersLength))
            } else {
                result += characters.charAt(Math.floor(Math.random() * 
            charactersLength));
            }
        }
       return result;
    }

    async function createSupplierUser(id: string): Promise<any> {
        var user: User = {
            ID: `scriptuser-${id}`,
            Username: `scriptuser${id}`,
            FirstName: 'Eric',
            LastName: 'King',
            Email: 'eking@four51.com',
            Password: password,
            Active: true
        }
        var newUser = await adminSdk.SupplierUsers.Save(id, user.ID!, user);
        try {
            await adminSdk.SecurityProfiles.SaveAssignment({
                SupplierID: id,
                UserID: newUser.ID,
                SecurityProfileID: 'MPProductAdmin'
            });
        } catch {}
        newUser.Password = user.Password!;
        return newUser;
    }

    async function CleanUpSupplierUsers(): Promise<void> {
        console.log("Deleting Supplier Users")
        const suppliers = await Suppliers.List();
        await batchOperations(suppliers.Items, async function singleOperation(
            supplier: Supplier): Promise<void> {
                try {
                    await adminSdk.SupplierUsers.Delete(supplier.ID!, `scriptuser-${supplier.ID}`)
                } catch {}
            }
        )
    }


    console.log(`Patching ${total} products.`)

    await batchOperations(products, async function singleOperation(
        product: Product
    ): Promise<any> {
        const patchBody = partialProducts.find(p => p.productID === product.ID)?.patch
        try {
            if(patchBody) {
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
            } else {
                errors[product.ID!] = 'No patch object for this product'
            }
            
        } catch (e) {
            try {
                if(patchBody) {
                    await adminSdk.Products.Patch(product.ID!, patchBody); //try once more as admin user.
                }
                console.log(`Patched ${progress} out of ${total}`);
                progress++;
            } catch (e) {
                console.log("error")
            }
            errors[product.ID!] = e.errors;
        }
    })

    await CleanUpSupplierUsers()

    await log(errors)
    log(errors, 'headstart-patch-errors');
    console.log("done")
}